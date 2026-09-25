package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class AgingBreakdownRow {
    private Long id;
    private String name;
    private BigDecimal totalValue;
    private long invoiceCount;
}
