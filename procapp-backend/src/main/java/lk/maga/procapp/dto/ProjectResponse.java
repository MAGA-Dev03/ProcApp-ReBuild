package lk.maga.procapp.dto;

import lk.maga.procapp.entity.Project;
import lombok.Getter;

@Getter

public class ProjectResponse {
    private final Long id;
    private final String code;
    private final String name;
    private final String status;
    private final String contractName;

    public ProjectResponse(Project p) {
        this.id = p.getId();
        this.code = p.getCode();
        this.name = p.getName();
        this.status = p.getStatus();
        this.contractName = p.getContractName();
    }
    
}
