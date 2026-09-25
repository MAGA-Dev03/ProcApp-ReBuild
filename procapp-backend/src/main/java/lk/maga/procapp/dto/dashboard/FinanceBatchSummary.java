package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class FinanceBatchSummary {
    private String listNo;
    private LocalDate financeSubmitDate;
    private long invoiceCount;
    private BigDecimal totalValue;
    
}
