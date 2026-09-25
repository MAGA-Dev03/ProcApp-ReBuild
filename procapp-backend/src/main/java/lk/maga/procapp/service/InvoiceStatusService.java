package lk.maga.procapp.service;

import lk.maga.procapp.entity.Invoice;
import org.springframework.stereotype.Service;

@Service
public class InvoiceStatusService {

    public enum Status {
        OPEN, GRN_PENDING, GRN_RECEIVED, SUBMITTED, CANCELLED
    }

    public Status compute(Invoice inv) {
        if (!inv.isActive()) {
            return Status.CANCELLED;
        }
        if (inv.getListNo() != null) {
            return Status.SUBMITTED;
        }
        boolean hasGrnNumber = inv.getGrnNumber() != null && !inv.getGrnNumber().isBlank();
        boolean hasGrnReceivedDate = inv.getGrnReceivedDate() != null;
        if (hasGrnNumber && hasGrnReceivedDate) {
            return Status.GRN_RECEIVED;
        }
        if (hasGrnNumber) {
            return Status.GRN_PENDING;
        }
        return Status.OPEN;
    }
    
}
