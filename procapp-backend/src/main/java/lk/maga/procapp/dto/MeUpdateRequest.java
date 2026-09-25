package lk.maga.procapp.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MeUpdateRequest {
    // Deliberately NO id field — the target account comes only from the
    // verified JWT subject on the server side. Deliberately no roles,
    // projects, allProjects, or active fields either — those stay
    // admin-only via PUT /api/users/{id}.
    private String name;
    private String password;
}