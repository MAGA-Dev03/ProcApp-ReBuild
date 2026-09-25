package lk.maga.procapp.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Map;

@Getter
@AllArgsConstructor
public class ApiError {
    private String message;
    private int status;
    private Map<String, String> fieldErrors;
    
}
