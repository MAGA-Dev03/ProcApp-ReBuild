package lk.maga.procapp.dto;

import lk.maga.procapp.entity.User;
import lombok.Getter;

@Getter
public class UserSummary {
    private final Long id;
    private final String name;

    public UserSummary(User u) {
        this.id = u.getId();
        this.name = u.getName();
    }
}