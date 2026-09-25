package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class TopSupplierRow {
    private Long supplierId;
    private String supplierName;
    private BigDecimal outstandingValue;
}
