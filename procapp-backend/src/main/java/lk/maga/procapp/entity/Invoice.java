package lk.maga.procapp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.springframework.cglib.core.Local;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor

public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_type", nullable = false)
    private String invoiceType; // CREDIT | ADVANCE | LC

    @Column(name = "invoice_source", nullable = false)
    private String invoiceSource; // DIRECT | STORES | PROJECT

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "invoice_number", nullable = false)
    private String invoiceNumber;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "purchase_order_number", nullable = false)
    private String purchaseOrderNumber;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal value;

    @Column(name = "pio_number")
    private String pioNumber;

    @Column(name = "grn_number")
    private String grnNumber;

    @Column(name = "grn_received_date")
    private LocalDate grnReceivedDate;

    @Column(name = "list_no")
    private String listNo;

    @Column(name = "finance_submit_date")
    private LocalDate financeSubmitDate;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "attachment_viewed", nullable = false)
    private boolean attachmentViewed;

    @Column(nullable = false)
    private boolean active;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_user_id", nullable =false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_user_id")
    private User updatedBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;



    
}
