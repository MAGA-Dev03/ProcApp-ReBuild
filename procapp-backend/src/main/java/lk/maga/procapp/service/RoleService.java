package lk.maga.procapp.service;

import lk.maga.procapp.dto.RoleRequest;
import lk.maga.procapp.entity.Role;
import lk.maga.procapp.exception.ValidationException;
import lk.maga.procapp.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public List<Role> list() {
        return roleRepository.findAll();
    }

    @Transactional
    public Role create(RoleRequest req) {
        if (roleRepository.existsByNameIgnoreCase(req.getName())) {
            throw new ValidationException(Map.of("name", "A role with this name already exists. "));
        }
        Role role = new Role();
        role.setName(req.getName());
        return roleRepository.save(role);
    }

}
