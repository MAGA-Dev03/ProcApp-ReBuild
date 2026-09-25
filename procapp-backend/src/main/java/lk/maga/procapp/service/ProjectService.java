package lk.maga.procapp.service;

import lk.maga.procapp.dto.ProjectRequest;
import lk.maga.procapp.entity.Project;
import lk.maga.procapp.repository.ProjectRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public Page<Project> list(String search, Pageable pageable) {
        return projectRepository.search(search, pageable);
    }

    public Project getOrThrow(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    @Transactional
    public Project create(ProjectRequest req) {
        if (projectRepository.existsByCodeIgnoreCase(req.getCode())) {
            throw fieldError("code", "A project with this code already exists.");
        }
        Project p = new Project();
        applyFields(p, req);
        return projectRepository.save(p);
    }

    @Transactional
    public Project update(Long id, ProjectRequest req) {
        Project p = getOrThrow(id);
        if (projectRepository.existsByCodeIgnoreCaseAndIdNot(req.getCode(), id)) {
            throw fieldError("code", "A project with this code already exists.");
        }
        applyFields(p, req);
        return projectRepository.save(p);
    }

    @Transactional
    public void delete(Long id) {
        Project p = getOrThrow(id);
        // DB-level ON DELETE CASCADE handles invoices + user_projects rows
        // atomically as part of this same statement — no manual cleanup needed.
        projectRepository.delete(p);
    }

    public long deleteImpact(Long id) {
        getOrThrow(id); // 404 if the project itself doesn't exist
        return projectRepository.countInvoicesByProjectId(id);
    }

    private void applyFields(Project p, ProjectRequest req) {
        p.setCode(req.getCode());
        p.setName(req.getName());
        p.setStatus(req.getStatus());
        p.setContractName(req.getContractName());
    }

    private lk.maga.procapp.exception.ValidationException fieldError(String field, String message) {
    return new lk.maga.procapp.exception.ValidationException(Map.of(field, message));
}
    
}