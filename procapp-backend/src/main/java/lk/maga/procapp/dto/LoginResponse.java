package lk.maga.procapp.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private UserPayload user;

    @Getter
    @AllArgsConstructor
    public static class UserPayload {
        private Long id;
        private String name;
        private String email;
        private boolean allProjects;
        private boolean active;
        private OffsetDateTime createdAt;
        private List<RoleResponse> roles;
        private List<ProjectResponse> projects; 
    }
    
}
