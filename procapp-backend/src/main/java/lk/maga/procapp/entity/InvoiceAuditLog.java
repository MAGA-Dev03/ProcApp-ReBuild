package lk.maga.procapp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/** Append-only. Rows are only ever inserted, never updated or deleted -
 * this is the historical record of who changed what on an invoice. */
@Entity
@Table(name = "invoice_audit_log")
@Getter
@Setter
@NoArgsConstructor
public class InvoiceAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_id", nullable = false)
    private Long invoiceId;

    @Column(nullable = false, length = 30)
    private String action;

    @Column(name = "performed_by_user_id")
    private Long performedByUserId;

    @Column(name = "performed_at", nullable = false)
    private OffsetDateTime performedAt;

    @Column(name = "before_data", columnDefinition = "TEXT")
    private String beforeData;

    @Column(name = "after_data", columnDefinition = "TEXT")
    private String afterData;

    public InvoiceAuditLog(Long invoiceId, String action, Long performedByUserId,
                            String beforeData, String afterData) {
        this.invoiceId = invoiceId;
        this.action = action;
        this.performedByUserId = performedByUserId;
        this.performedAt = OffsetDateTime.now();
        this.beforeData = beforeData;
        this.afterData = afterData;
    }
}
