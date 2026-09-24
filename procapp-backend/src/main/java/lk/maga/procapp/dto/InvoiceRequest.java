package lk.maga.procapp.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;


@Getter
@Setter
public class InvoiceRequest {

    /** Reference numbers must start with a letter or digit and contain no control characters, so a
     * value like "=HYPERLINK(...)" can never be stored and later run as a formula in a report export
     * (F-17). Empty is allowed here; required fields add @NotBlank. */
    public static final String REFERENCE_NUMBER_PATTERN = "^ *$|^ *[A-Za-z0-9][^\\p{Cntrl}]*$";
    public static final String REFERENCE_NUMBER_MESSAGE =
            "must start with a letter or digit and contain no control characters";

    @NotBlank
    @Pattern(regexp = "CREDIT|ADVANCE|LC")
    private String invoiceType;

    @NotBlank
    @Pattern(regexp = "DIRECT|STORES|PROJECT")
    private String invoiceSource;

    @NotNull
    private Long projectId;

    @NotNull
    private Long supplierId;

    @NotBlank
    @Pattern(regexp = REFERENCE_NUMBER_PATTERN, message = REFERENCE_NUMBER_MESSAGE)
    private String invoiceNumber;

    @NotNull
    private LocalDate invoiceDate;

    @NotNull
    private LocalDate receivedDate;

    @NotBlank
    @Pattern(regexp = REFERENCE_NUMBER_PATTERN, message = REFERENCE_NUMBER_MESSAGE)
    private String purchaseOrderNumber;

    @NotNull
    @DecimalMin(value = "0.01", message = "value must be greater than 0")
    private BigDecimal value;

    @Pattern(regexp = REFERENCE_NUMBER_PATTERN, message = REFERENCE_NUMBER_MESSAGE)
    private String pioNumber;
    @Pattern(regexp = REFERENCE_NUMBER_PATTERN, message = REFERENCE_NUMBER_MESSAGE)
    private String grnNumber;
    private LocalDate grnReceivedDate;
    private String remarks;
    private String attachmentUrl;
    private Long id;
    private java.time.OffsetDateTime createdAt;
    private Long authorUserId;
    
}
