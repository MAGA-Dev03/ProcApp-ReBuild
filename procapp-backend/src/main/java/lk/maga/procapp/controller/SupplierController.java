package lk.maga.procapp.controller;

import jakarta.validation.Valid;
import lk.maga.procapp.dto.PageResponse;
import lk.maga.procapp.dto.SupplierRequest;
import lk.maga.procapp.dto.SupplierResponse;
import lk.maga.procapp.entity.Supplier;
import lk.maga.procapp.security.RoleNames;
import lk.maga.procapp.service.SupplierService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    public PageResponse<SupplierResponse> list(
            @RequestParam(required = false) String search,
            Pageable pageable
    ) {
        return PageResponse.from(supplierService.list(search, pageable), SupplierResponse::new);
    }

    @GetMapping("/{id}")
    public SupplierResponse getOne(@PathVariable Long id) {
        return new SupplierResponse(supplierService.getOrThrow(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierRequest req) {
        Supplier created = supplierService.create(req);
        return ResponseEntity.ok(new SupplierResponse(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public SupplierResponse update(@PathVariable Long id, @Valid @RequestBody SupplierRequest req) {
        return new SupplierResponse(supplierService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('" + RoleNames.ADMIN + "', '" + RoleNames.SYSTEM_ADMIN + "')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}