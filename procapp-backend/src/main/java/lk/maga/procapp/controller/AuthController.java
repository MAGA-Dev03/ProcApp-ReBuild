package lk.maga.procapp.controller;

import jakarta.validation.Valid;
import lk.maga.procapp.dto.LoginRequest;
import lk.maga.procapp.dto.LoginResponse;
import lk.maga.procapp.dto.RoleResponse;
import lk.maga.procapp.dto.ProjectResponse;
import lk.maga.procapp.repository.UserRepository;
import lk.maga.procapp.security.CustomUserDetails;
import lk.maga.procapp.security.JwtService;
import lk.maga.procapp.security.LoginAttemptService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
                           LoginAttemptService loginAttemptService, UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        if (loginAttemptService.isLocked(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed login attempts. Please try again later.");
        }

        Authentication authResult;
        try {
            authResult = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException | DisabledException e) {
            // Deliberately identical response whether the password was
            // wrong OR the account is inactive — never let a login attempt
            // reveal which case it was.
            loginAttemptService.recordFailure(request.getEmail());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        loginAttemptService.recordSuccess(request.getEmail());
        CustomUserDetails userDetails = (CustomUserDetails) authResult.getPrincipal();
        String token = jwtService.generateToken(userDetails);
        lk.maga.procapp.entity.User u = userDetails.getUser();

        List<RoleResponse> roles = u.getRoles().stream().map(RoleResponse::new).toList();
        List<ProjectResponse> projects = u.getProjects().stream().map(ProjectResponse::new).toList();

        LoginResponse.UserPayload payload = new LoginResponse.UserPayload(
            u.getId(), u.getName(), u.getEmail(), u.isAllProjects(), u.isActive(),
            u.getCreatedAt(), roles, projects
        );

        return ResponseEntity.ok(new LoginResponse(token, payload));
        
    }

    /**
     * Server-side logout: bumps the user's token_version, which invalidates
     * every token issued to them so far (all devices), not just the copy the
     * browser is about to discard. A replayed copy of the token gets 401.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication) {
        userRepository.incrementTokenVersion((Long) authentication.getPrincipal());
        return ResponseEntity.noContent().build();
    }
}
