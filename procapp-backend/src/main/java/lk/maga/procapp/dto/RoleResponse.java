package lk.maga.procapp.dto;

import lk.maga.procapp.entity.Role;
import lombok.Getter;

@Getter
public class RoleResponse {
    private final Long id;
    private final String name;

    public RoleResponse(Role r) {
        this.id = r.getId();
        this.name = r.getName();
    }
    
}
