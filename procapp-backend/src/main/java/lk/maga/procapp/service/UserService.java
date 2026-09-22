package lk.maga.procapp.service;

import lk.maga.procapp.dto.MeUpdateRequest;
import lk.maga.procapp.dto.UserRequest;
import lk.maga.procapp.entity.Project;
import lk.maga.procapp.entity.Role;
import lk.maga.procapp.entity.User;
import lk.maga.procapp.exception.ValidationException;
import lk.maga.procapp.repository.ProjectRepository;
import lk.maga.procapp.repository.RoleRepository;
import lk.maga.procapp.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import java.time.OffsetDateTime;

@Service
public class UserService {

    private static final int PASSWORD_MIN_LENGTH = 8;
    private static final Pattern PASSWORD_HAS_LETTER = Pattern.compile("[A-Za-z]");
    private static final Pattern PASSWORD_HAS_DIGIT = Pattern.compile("[0-9]");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            ProjectRepository projectRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.projectRepository = projectRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Page<User> list(String search, Pageable pageable) {
        return userRepository.search(search, pageable);
    }

    @Transactional(readOnly = true)
    public User getOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    @Transactional
    public User create(UserRequest req) {
        Map<String, String> fieldErrors = new HashMap<>();

        if (userRepository.existsByEmailIgnoreCase(req.getEmail())) {
            fieldErrors.put("email", "A user with this email already exists.");
        }
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            fieldErrors.put("password", "Password is required.");
        } else {
            validatePasswordStrength(req.getPassword(), fieldErrors);
        }

        Set<Role> roles = resolveRoles(req.getRoleIds(), fieldErrors);
        Set<Project> projects = resolveProjects(req.getProjectIds(), fieldErrors);

        if (!fieldErrors.isEmpty()) {
            throw new ValidationException(fieldErrors);
        }

        User u = new User();
        u.setName(req.getName());
        u.setEmail(req.getEmail());
        u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        u.setAllProjects(req.isAllProjects());
        u.setActive(req.getActive() == null || req.getActive()); // default true
        u.setRoles(roles);
        // allProjects: true ignores projectIds entirely, per the contract.
        u.setProjects(req.isAllProjects() ? new HashSet<>() : projects);
        u.setCreatedAt(OffsetDateTime.now());

        return userRepository.save(u);
    }

    @Transactional
    public User update(Long id, UserRequest req) {
        User u = getOrThrow(id);
        Map<String, String> fieldErrors = new HashMap<>();

        if (userRepository.existsByEmailIgnoreCaseAndIdNot(req.getEmail(), id)) {
            fieldErrors.put("email", "A user with this email already exists.");
        }

        Set<Role> roles = resolveRoles(req.getRoleIds(), fieldErrors);
        Set<Project> projects = resolveProjects(req.getProjectIds(), fieldErrors);

        boolean changingPassword = req.getPassword() != null && !req.getPassword().isBlank();
        if (changingPassword) {
            validatePasswordStrength(req.getPassword(), fieldErrors);
        }

        if (!fieldErrors.isEmpty()) {
            throw new ValidationException(fieldErrors);
        }

        u.setName(req.getName());
        u.setEmail(req.getEmail());
        // Blank/omitted password = keep the existing hash untouched.
        if (changingPassword) {
            u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        }
        u.setAllProjects(req.isAllProjects());
        if (req.getActive() != null) {
            u.setActive(req.getActive());
        }
        u.setRoles(roles);
        u.setProjects(req.isAllProjects() ? new HashSet<>() : projects);

        return userRepository.save(u);
    }

    @Transactional
    public User updateMe(Long userId, MeUpdateRequest req) {
        User u = getOrThrow(userId);
        if (req.getName() != null && !req.getName().isBlank()) {
            u.setName(req.getName());
        }
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            Map<String, String> fieldErrors = new HashMap<>();
            validatePasswordStrength(req.getPassword(), fieldErrors);
            if (!fieldErrors.isEmpty()) {
                throw new ValidationException(fieldErrors);
            }
            u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        }
        // Deliberately nothing else is touched here — no roles, projects,
        // allProjects, or active, no matter what a client sends. This is
        // the fix for the legacy hidden-id IDOR bug: the row to update
        // came only from the verified JWT subject above, never from any
        // client-supplied field.
        //
        // `u` is already managed by this transaction, so the field changes
        // above are persisted on commit via dirty checking. Do NOT call
        // save()/merge() here: merge deep-copies the eager role/project
        // collections (CollectionType.replaceElements -> PersistentSet.clear())
        // and throws UnsupportedOperationException whenever either collection
        // was built from an immutable Set.
        return u;
    }

    @Transactional
    public void delete(Long id) {
        User u = getOrThrow(id);
        long invoiceCount = userRepository.countInvoicesAuthoredByUserId(id);
        if (invoiceCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete user: authored " + invoiceCount + " invoice(s). Consider deactivating instead."
            );
        }
        userRepository.delete(u);
    }

    private void validatePasswordStrength(String password, Map<String, String> fieldErrors) {
        if (password.length() < PASSWORD_MIN_LENGTH) {
            fieldErrors.put("password", "Password must be at least " + PASSWORD_MIN_LENGTH + " characters long.");
        } else if (!PASSWORD_HAS_LETTER.matcher(password).find() || !PASSWORD_HAS_DIGIT.matcher(password).find()) {
            fieldErrors.put("password", "Password must contain at least one letter and one number.");
        }
    }

    private Set<Role> resolveRoles(Set<Long> roleIds, Map<String, String> fieldErrors) {
        Set<Role> roles = new HashSet<>();
        if (roleIds == null) return roles;
        for (Long id : roleIds) {
            if (id == null) {
                fieldErrors.put("roleIds", "Role id must not be null.");
                continue;
            }
            roleRepository.findById(id).ifPresentOrElse(
                    roles::add,
                    () -> fieldErrors.put("roleIds", "Role id " + id + " does not exist.")
            );
        }
        return roles;
    }

    private Set<Project> resolveProjects(Set<Long> projectIds, Map<String, String> fieldErrors) {
        Set<Project> projects = new HashSet<>();
        if (projectIds == null) return projects;
        for (Long id : projectIds) {
            if (id == null) {
                fieldErrors.put("projectIds", "Project id must not be null.");
                continue;
            }
            projectRepository.findById(id).ifPresentOrElse(
                    projects::add,
                    () -> fieldErrors.put("projectIds", "Project id " + id + " does not exist.")
            );
        }
        return projects;
    }
}