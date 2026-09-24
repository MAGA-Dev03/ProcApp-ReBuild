package lk.maga.procapp.controller;

import jakarta.validation.Valid;
import lk.maga.procapp.dto.RoleRequest;
import lk.maga.procapp.dto.RoleResponse;
import lk.maga.procapp.entity.Role;
import lk.maga.procapp.security.RoleNames;
import lk.maga.procapp.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public List<RoleResponse> list() {
        return roleService.list().stream().map(RoleResponse::new).toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ResponseEntity<RoleResponse> create(@Valid @RequestBody RoleRequest req){
        Role created = roleService.create(req);
        return ResponseEntity.ok(new RoleResponse(created));
    }
}
