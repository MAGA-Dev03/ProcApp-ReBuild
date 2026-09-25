package lk.maga.procapp.dto;

import lk.maga.procapp.entity.Supplier;
import lombok.Getter;

@Getter
public class SupplierResponse {
    private final Long id;
    private final String businessPartnerCode;
    private final String name;
    private final String address;
    private final String email;
    private final String contact;

    public SupplierResponse(Supplier s) {
        this.id = s.getId();
        this.businessPartnerCode = s.getBusinessPartnerCode();
        this.name = s.getName();
        this.address = s.getAddress();
        this.email = s.getEmail();
        this.contact = s.getContact();
    }
    
}
