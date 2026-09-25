package lk.maga.procapp.service;

import lk.maga.procapp.dto.SupplierRequest;
import lk.maga.procapp.entity.Supplier;
import lk.maga.procapp.exception.ValidationException;
import lk.maga.procapp.repository.SupplierRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    public Page<Supplier> list(String search, Pageable pageable) {
        return supplierRepository.search(search, pageable);
    }

    public Supplier getOrThrow(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    @Transactional
    public Supplier create(SupplierRequest req) {
        validateUniqueness(req, null);
        Supplier s = new Supplier();
        applyFields(s, req);
        return supplierRepository.save(s);
    }

    @Transactional
    public Supplier update(Long id, SupplierRequest req) {
        Supplier s = getOrThrow(id);
        validateUniqueness(req, id);
        applyFields(s, req);
        return supplierRepository.save(s);
    }

    @Transactional
    public void delete(Long id) {
        Supplier s = getOrThrow(id);
        long invoiceCount = supplierRepository.countInvoicesBySupplierId(id);
        if (invoiceCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete supplier: referenced by " + invoiceCount + " invoice(s). Consider deactivating instead."
            );
        }
        supplierRepository.delete(s);
    }

    private void validateUniqueness(SupplierRequest req, Long excludeId) {
        boolean bpcodeTaken = excludeId == null
                ? supplierRepository.existsByBusinessPartnerCodeIgnoreCase(req.getBusinessPartnerCode())
                : supplierRepository.existsByBusinessPartnerCodeIgnoreCaseAndIdNot(req.getBusinessPartnerCode(), excludeId);
        if (bpcodeTaken) {
            throw new ValidationException(Map.of("businessPartnerCode", "A supplier with this business partner code already exists."));
        }

        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            boolean emailTaken = excludeId == null
                    ? supplierRepository.existsByEmailIgnoreCase(req.getEmail())
                    : supplierRepository.existsByEmailIgnoreCaseAndIdNot(req.getEmail(), excludeId);
            if (emailTaken) {
                throw new ValidationException(Map.of("email", "A supplier with this email already exists."));
            }
        }
    }

    private void applyFields(Supplier s, SupplierRequest req) {
        s.setBusinessPartnerCode(req.getBusinessPartnerCode());
        s.setName(req.getName());
        s.setAddress(req.getAddress());
        s.setEmail(req.getEmail());
        s.setContact(req.getContact());
    }
}