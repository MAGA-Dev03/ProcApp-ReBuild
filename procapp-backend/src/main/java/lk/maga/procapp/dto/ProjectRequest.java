package lk.maga.procapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter

public class ProjectRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String name;

    @NotBlank
    @Pattern(regexp = "WORKING|FINISHED", message = "status must be WORKING or FINISHED")
    private String status;

    private String contractName;
    
}
