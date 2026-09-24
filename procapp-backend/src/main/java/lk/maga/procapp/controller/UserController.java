package lk.maga.procapp.controller;

import jakarta.validation.Valid;
import lk.maga.procapp.dto.MeUpdateRequest;
import lk.maga.procapp.dto.PageResponse;
import lk.maga.procapp.dto.UserRequest;
import lk.maga.procapp.dto.UserResponse;
import lk.maga.procapp.entity.User;
import lk.maga.procapp.security.RoleNames;
import lk.maga.procapp.service.UserService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public PageResponse<UserResponse> list(
            @RequestParam(required = false) String search,
            Pageable pageable
    ) {
        return PageResponse.from(userService.list(search, pageable), UserResponse::new);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public UserResponse getOne(@PathVariable Long id) {
        return new UserResponse(userService.getOrThrow(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest req) {
        User created = userService.create(req);
        return ResponseEntity.ok(new UserResponse(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserRequest req) {
        return new UserResponse(userService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Any authenticated user — own account only. No @PreAuthorize role
    // check needed; the security is that userId comes from the verified
    // token, never from the request body or URL.
    @PutMapping("/me")
    public UserResponse updateMe(Authentication authentication, @Valid @RequestBody MeUpdateRequest req) {
        Long userId = (Long) authentication.getPrincipal();
        return new UserResponse(userService.updateMe(userId, req));
    }
}