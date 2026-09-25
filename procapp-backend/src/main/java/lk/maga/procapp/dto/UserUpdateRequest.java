package lk.maga.procapp.dto;

import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

/**
 * Body of PUT /api/users/{id}. Every field is optional: null/omitted means
 * "keep the current value". Deliberately no defaults (no empty sets, no
 * primitive booleans) — a default would be indistinguishable from an
 * explicit value and would silently wipe the user's roles/projects on a
 * partial update. Blank name/email are rejected in the service layer.
 */
@Getter
@Setter
public class UserUpdateRequest {

    private String name;

    @Email
    private String email;

    // Blank/null = keep the existing hash.
    private String password;

    private Boolean allProjects;

    // null = keep current; an explicit empty set is valid and clears them.
    private Set<Long> roleIds;
    private Set<Long> projectIds;

    private Boolean active;
}
