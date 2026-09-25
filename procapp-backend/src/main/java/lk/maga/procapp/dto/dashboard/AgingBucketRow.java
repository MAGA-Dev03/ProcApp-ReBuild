package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class AgingBucketRow {
    private String bucket;
    private BigDecimal totalValue;
    private long invoiceCount;
}