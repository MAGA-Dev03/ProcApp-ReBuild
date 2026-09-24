package lk.maga.procapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GrnRequest {
    @NotBlank
    @Pattern(regexp = InvoiceRequest.REFERENCE_NUMBER_PATTERN, message = InvoiceRequest.REFERENCE_NUMBER_MESSAGE)
    private String grnNumber;

}
