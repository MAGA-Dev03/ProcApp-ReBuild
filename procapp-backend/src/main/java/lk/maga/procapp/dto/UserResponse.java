package lk.maga.procapp.dto;

import lk.maga.procapp.entity.User;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
public class UserResponse {
    private final Long id;
    private final String name;
    private final String email;
    private final boolean allProjects;
    private final boolean active;
    private final OffsetDateTime createdAt;
    private final List<RoleResponse> roles;
    private final List<ProjectResponse> projects;

    public UserResponse(User u) {
        this.id = u.getId();
        this.name = u.getName();
        this.email = u.getEmail();
        this.allProjects = u.isAllProjects();
        this.active = u.isActive();
        this.createdAt = u.getCreatedAt();
        // password_hash is deliberately never included here.
        this.roles = u.getRoles().stream().map(RoleResponse::new).toList();
        this.projects = u.getProjects().stream().map(ProjectResponse::new).toList();
    }
}