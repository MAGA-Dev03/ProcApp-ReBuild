package lk.maga.procapp.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "suppliers")
@Getter 
@Setter
@NoArgsConstructor
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "business_partner_code", nullable = false)
    private String businessPartnerCode;

    @Column(nullable = false)
    private String name;

    private String address;

    private String email;

    private String contact;
    
}
