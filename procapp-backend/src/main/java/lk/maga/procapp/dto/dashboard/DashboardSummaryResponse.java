package lk.maga.procapp.dto.dashboard;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DashboardSummaryResponse {
    /** Sum of value where active && list_no IS NULL - the open receivable. */
    private BigDecimal outstandingValue;
    /** Count of active invoices whose GRN process isn't complete yet. */
    private long grnPendingCount;
    /** Count of active invoices with GRN complete but not yet batched to finance. */
    private long readyToSubmitCount;
    /** Sum of value where finance_submit_date falls in the current calendar month. */
    private BigDecimal submittedThisMonthValue;
}
