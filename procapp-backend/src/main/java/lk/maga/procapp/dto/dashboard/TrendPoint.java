package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class TrendPoint {
    private String month;
    private BigDecimal receivedValue;
    private BigDecimal submittedValue;
}
