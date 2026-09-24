package lk.maga.procapp.controller;

import jakarta.validation.Valid;
import lk.maga.procapp.dto.DeleteImpactResponse;
import lk.maga.procapp.dto.PageResponse;
import lk.maga.procapp.dto.ProjectRequest;
import lk.maga.procapp.dto.ProjectResponse;
import lk.maga.procapp.entity.Project;
import lk.maga.procapp.security.RoleNames;
import lk.maga.procapp.service.ProjectService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    // Any authenticated user can read — needed for form pickers across roles.
    @GetMapping
    public PageResponse<ProjectResponse> list(
            @RequestParam(required = false) String search,
            Pageable pageable
    ) {
        return PageResponse.from(projectService.list(search, pageable), ProjectResponse::new);
    }

    @GetMapping("/{id}")
    public ProjectResponse getOne(@PathVariable Long id) {
        return new ProjectResponse(projectService.getOrThrow(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ResponseEntity<ProjectResponse> create(@Valid @RequestBody ProjectRequest req) {
        Project created = projectService.create(req);
        return ResponseEntity.ok(new ProjectResponse(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ProjectResponse update(@PathVariable Long id, @Valid @RequestBody ProjectRequest req) {
        return new ProjectResponse(projectService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/delete-impact")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public DeleteImpactResponse deleteImpact(@PathVariable Long id) {
        return new DeleteImpactResponse(projectService.deleteImpact(id));
    }
}