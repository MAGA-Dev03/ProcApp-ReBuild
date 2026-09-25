package lk.maga.procapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SupplierRequest {

    @NotBlank
    private String businessPartnerCode;

    @NotBlank
    private String name;

    private String address;

    @Email
    private String email;

    private String contact;

}
