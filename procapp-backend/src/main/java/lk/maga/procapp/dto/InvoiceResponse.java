package lk.maga.procapp.dto;

import lk.maga.procapp.entity.Invoice;
import lk.maga.procapp.service.InvoiceStatusService;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
public class InvoiceResponse {
    private final Long id;
    private final String invoiceType;
    private final String invoiceSource;
    private final ProjectResponse project;
    private final SupplierResponse supplier;
    private final String invoiceNumber;
    private final LocalDate invoiceDate;
    private final LocalDate receivedDate;
    private final String purchaseOrderNumber;
    private final BigDecimal value;
    private final String pioNumber;
    private final String grnNumber;
    private final LocalDate grnReceivedDate;
    private final String listNo;
    private final LocalDate financeSubmitDate;
    private final String remarks;
    private final String attachmentUrl;
    private final boolean attachmentViewed;
    private final boolean active;
    private final UserSummary author;
    private final UserSummary updatedBy;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;
    private final String status;

    public InvoiceResponse(Invoice inv, InvoiceStatusService statusService) {
        this.id = inv.getId();
        this.invoiceType = inv.getInvoiceType();
        this.invoiceSource = inv.getInvoiceSource();
        this.project = new ProjectResponse(inv.getProject());
        this.supplier = new SupplierResponse(inv.getSupplier());
        this.invoiceNumber = inv.getInvoiceNumber();
        this.invoiceDate = inv.getInvoiceDate();
        this.receivedDate = inv.getReceivedDate();
        this.purchaseOrderNumber = inv.getPurchaseOrderNumber();
        this.value = inv.getValue();
        this.pioNumber = inv.getPioNumber();
        this.grnNumber = inv.getGrnNumber();
        this.grnReceivedDate = inv.getGrnReceivedDate();
        this.listNo = inv.getListNo();
        this.financeSubmitDate = inv.getFinanceSubmitDate();
        this.remarks = inv.getRemarks();
        this.attachmentUrl = inv.getAttachmentUrl();
        this.attachmentViewed = inv.isAttachmentViewed();
        this.active = inv.isActive();
        this.author = new UserSummary(inv.getAuthor());
        this.updatedBy = inv.getUpdatedBy() != null ? new UserSummary(inv.getUpdatedBy()) : null;
        this.createdAt = inv.getCreatedAt();
        this.updatedAt = inv.getUpdatedAt();
        this.status = statusService.compute(inv).name();
    }
}