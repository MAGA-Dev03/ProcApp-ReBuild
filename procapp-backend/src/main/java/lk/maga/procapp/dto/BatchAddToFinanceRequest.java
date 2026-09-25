package lk.maga.procapp.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BatchAddToFinanceRequest {

    @NotEmpty
    private List<Long> invoiceIds;
    
}
