package lk.maga.procapp.dto;

import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
public class InvoiceAuditLogResponse {
    private final Long id;
    private final Long invoiceId;
    private final String invoiceNumber;
    private final String action;
    private final Long performedByUserId;
    private final String performedByName;
    private final OffsetDateTime performedAt;
    private final String beforeData;
    private final String afterData;

    public InvoiceAuditLogResponse(
            Long id, Long invoiceId, String invoiceNumber, String action,
            Long performedByUserId, String performedByName, OffsetDateTime performedAt,
            String beforeData, String afterData
    ) {
        this.id = id;
        this.invoiceId = invoiceId;
        this.invoiceNumber = invoiceNumber;
        this.action = action;
        this.performedByUserId = performedByUserId;
        this.performedByName = performedByName;
        this.performedAt = performedAt;
        this.beforeData = beforeData;
        this.afterData = afterData;
    }
}
