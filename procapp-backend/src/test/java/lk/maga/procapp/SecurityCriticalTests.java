package lk.maga.procapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lk.maga.procapp.entity.*;
import lk.maga.procapp.repository.*;
import lk.maga.procapp.security.CustomUserDetails;
import lk.maga.procapp.security.JwtService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Each test in this class corresponds to a security-critical rule that was
 * explicitly modeled on a real past bug. These are regression tests: their
 * entire purpose is to keep failing loudly forever if any future change
 * reintroduces the underlying vulnerability, even if the change looks
 * unrelated on the surface.
 *
 * The whole class runs inside one rolled-back transaction per test
 * (@Transactional), so all fixture data created here (test users, roles,
 * projects, invoices) is automatically discarded afterward and never
 * pollutes the real migrated dataset.
 */

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SecurityCriticalTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private lk.maga.procapp.service.InvoiceService invoiceService;
    @PersistenceContext private EntityManager entityManager;

    private String tokenFor(User user ) {
        return jwtService.generateToken(new CustomUserDetails(user));

    }

    private User createUser(String email, Set<Role> roles, boolean allProjects, Set<Project> projects) {
        User u = new User();
        u.setName("Test User");
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode("irrelevant-for-these-tests"));
        u.setAllProjects(allProjects);
        u.setActive(true);
        u.setCreatedAt(OffsetDateTime. now());
        u.setRoles(roles);
        u.setProjects(projects != null ? projects : new HashSet<>());
        return userRepository.save(u);

    }

    private Project createProject(String code) {
        Project p = new Project();
        p.setCode(code);
        p.setName("Test Project " + code);
        p.setStatus("WORKING");
        return projectRepository.save(p);

    }

    private Supplier createSupplier(String bpCode) {
        Supplier s = new Supplier();
        s.setBusinessPartnerCode(bpCode);
        s.setName("Test Supplier " + bpCode);
        return supplierRepository.save(s);
    }

    private Invoice createInvoice(Project project, Supplier supplier, User author, String grnNumber ) {
        Invoice inv = new Invoice();
        inv.setInvoiceType("CREDIT");
        inv.setInvoiceSource("PROJECT");
        inv.setProject(project);
        inv.setSupplier(supplier);
        inv.setInvoiceNumber("TESTINV-" + System.nanoTime());
        inv.setInvoiceDate(LocalDate.now());
        inv.setReceivedDate(LocalDate.now());
        inv.setPurchaseOrderNumber("PO-TEST");
        inv.setValue(new BigDecimal("1000.00"));
        inv.setGrnNumber(grnNumber);
        inv.setActive(true);
        inv.setAuthor(author);
        OffsetDateTime now = OffsetDateTime.now();
        inv.setCreatedAt(now);
        inv.setUpdatedAt(now);
        return invoiceRepository.save(inv);
    }

    // --- Rule 1: Identity comes from the verified token, never the
    // request payload — specifically the /me endpoint, modeled on a real
    // legacy IDOR bug where a hidden client-supplied id field let anyone
    // edit anyone else's profile. ---

    @Test
    void meEndpoint_ignoresSmuggledIdAndOnlyUpdatesTokenOwner() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        User victim = createUser("victim-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        User attacker = createUser("attacker-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        String attackerToken = tokenFor(attacker);
        String victimOriginalName = victim.getName();

        String body = objectMapper.writeValueAsString(java.util.Map.of(
            "id", victim.getId(),
            "name", "Hijacked Name"
        ));

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + attackerToken)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(attacker.getId()))
                .andExpect(jsonPath("$.name").value("Hijacked Name"));
                
        User victimAfter = userRepository.findById(victim.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(victimOriginalName, victimAfter.getName(),
                "The smuggled id must never affect any account other than the token's own subject.");

    }

    // --- Rule 2: Site Store Keeper row-level scoping — a scoped user
    // requesting an out-of-scope project must get an empty result, never
    // a fallback to the full unscoped list. ---
    @Test 
    void siteKeeperScoping_outOfScopeProjectReturnsEmptyNotFullList() throws Exception {
        Role siteKeeperRole = roleRepository.findByNameIgnoreCase("SITE_STORE_KEEPER").orElseThrow();
        Project allowedProject = createProject("ALLOWED-" + System.nanoTime());
        Project forbiddenProject = createProject("FORBIDDEN-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-TEST-" + System.nanoTime());

        User scopedUser = createUser(
            "sitekeeper-" + System.nanoTime() + "@test.local",
            Set.of(siteKeeperRole), false, Set.of(allowedProject)
            );
        User author = createUser("author-" + System.nanoTime() + "@test.local", Set.of(), true, null);

        createInvoice(forbiddenProject, supplier, author, "GRN-1");

        String token = tokenFor(scopedUser);

        mockMvc.perform(get("/api/site-keeper/invoices")
                        .param("projectId", forbiddenProject.getId().toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.content.length()").value(0));        
    }

    // --- Rule 3: Finance batching must be atomic — one invalid invoice
    // in a batch must leave EVERY invoice in that batch unchanged, never
    // a partial submission. ---
    @Test
    void batchAddToFinance_invalidInvoiceLeavesEntireBatchUnchanged() throws Exception {
        Role managerRole = roleRepository.findByNameIgnoreCase("PROCUREMENT_MANAGER").orElseThrow();
        Project project = createProject("BATCHTEST-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-BATCH-" + System.nanoTime());
        User manager = createUser("manager-" + System.nanoTime() + "@test.local", Set.of(managerRole), true, null);

        Invoice validInvoice = createInvoice(project, supplier, manager, "GRN-VALID");
        Invoice invalidInvoice = createInvoice(project, supplier, manager, null);

        String token = tokenFor(manager);
        String body = objectMapper.writeValueAsString(
                java.util.Map.of("invoiceIds", java.util.List.of(validInvoice.getId(), invalidInvoice.getId()))
            );

        mockMvc.perform(post("/api/invoices/batch-add-to-finance")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body));
                        
        Invoice validAfter = invoiceRepository.findById(validInvoice.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertNull(validAfter.getListNo(),
                "A batch containing ANY invalid invoice must leave the whole batch unchanged, " +
                "including the otherwise-valid ones.");
        }

    // --- Rule 3b: A cancelled invoice must never be payable via finance
    // batching, and an invoice already in a batch must never be silently
    // re-batched (double payment). ---
    @Test
    void batchAddToFinance_rejectsCancelledInvoice() throws Exception {
        Role managerRole = roleRepository.findByNameIgnoreCase("PROCUREMENT_MANAGER").orElseThrow();
        Project project = createProject("BATCHTEST-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-BATCH-" + System.nanoTime());
        User manager = createUser("manager-" + System.nanoTime() + "@test.local", Set.of(managerRole), true, null);

        Invoice cancelledInvoice = createInvoice(project, supplier, manager, "GRN-CANCELLED");
        cancelledInvoice.setActive(false);
        cancelledInvoice = invoiceRepository.save(cancelledInvoice);

        String token = tokenFor(manager);
        String body = objectMapper.writeValueAsString(
                java.util.Map.of("invoiceIds", java.util.List.of(cancelledInvoice.getId()))
            );

        mockMvc.perform(post("/api/invoices/batch-add-to-finance")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().is4xxClientError());

        Invoice after = invoiceRepository.findById(cancelledInvoice.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertNull(after.getListNo(),
                "A cancelled invoice must never be submitted to finance.");
    }

    @Test
    void batchAddToFinance_rejectsInvoiceAlreadyInABatch() throws Exception {
        Role managerRole = roleRepository.findByNameIgnoreCase("PROCUREMENT_MANAGER").orElseThrow();
        Project project = createProject("BATCHTEST-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-BATCH-" + System.nanoTime());
        User manager = createUser("manager-" + System.nanoTime() + "@test.local", Set.of(managerRole), true, null);

        Invoice alreadyBatched = createInvoice(project, supplier, manager, "GRN-ALREADY");
        alreadyBatched.setListNo("2026/01/01/001");
        alreadyBatched = invoiceRepository.save(alreadyBatched);
        String originalListNo = alreadyBatched.getListNo();

        String token = tokenFor(manager);
        String body = objectMapper.writeValueAsString(
                java.util.Map.of("invoiceIds", java.util.List.of(alreadyBatched.getId()))
            );

        mockMvc.perform(post("/api/invoices/batch-add-to-finance")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().is4xxClientError());

        Invoice after = invoiceRepository.findById(alreadyBatched.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(originalListNo, after.getListNo(),
                "An invoice already submitted to finance must not be re-batched with a new list number.");
    }

    // --- Rule 3c (F-18): A finance batch number is never reused. The old
    // generator counted distinct list numbers, so clearing a batch lowered
    // the count and the next batch was issued the cleared batch's number,
    // merging two unrelated submissions in every report. ---
    @Test
    void batchAddToFinance_neverReusesNumberOfAClearedBatch() {
        Role managerRole = roleRepository.findByNameIgnoreCase("PROCUREMENT_MANAGER").orElseThrow();
        Project project = createProject("BATCHTEST-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-BATCH-" + System.nanoTime());
        User manager = createUser("manager-" + System.nanoTime() + "@test.local", Set.of(managerRole), true, null);

        Invoice first = createInvoice(project, supplier, manager, "GRN-FIRST");
        Invoice second = createInvoice(project, supplier, manager, "GRN-SECOND");

        String firstListNo = invoiceService.batchAddToFinance(
                java.util.List.of(first.getId()), manager.getId()).listNo();
        invoiceService.clearFinanceSubmission(first.getId(), manager.getId());
        String secondListNo = invoiceService.batchAddToFinance(
                java.util.List.of(second.getId()), manager.getId()).listNo();

        org.junit.jupiter.api.Assertions.assertNotEquals(firstListNo, secondListNo,
                "A new finance batch must never be given the number of a batch that was cleared.");
    }

        // --- Rule 4: Cascading vs. blocked deletes — projects cascade,
        // suppliers are blocked when referenced, with an accurate count. ---

         @Test
    void projectDeleteCascades_supplierDeleteIsBlockedWhenReferenced() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        User admin = createUser("delete-admin-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        Project project = createProject("DELTEST-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-DEL-" + System.nanoTime());
        Invoice inv = createInvoice(project, supplier, admin, "GRN-DEL");
        Long invoiceId = inv.getId();
        Long projectId = project.getId();
        Long supplierId = supplier.getId();

        String token = tokenFor(admin);

        // Supplier is referenced -> must be blocked, not silently orphaned.
        mockMvc.perform(delete("/api/suppliers/" + supplierId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("1 invoice")));

        // Project delete must cascade: the invoice disappears with it,
        // atomically, in the same operation.
        mockMvc.perform(delete("/api/projects/" + projectId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // The cascade happens at the DB (invoices.project_id ON DELETE
        // CASCADE), which Hibernate's first-level cache knows nothing about.
        // Flush the pending project delete and clear the cache so the
        // re-read below actually hits the database instead of returning the
        // stale Invoice created earlier in this test.
        entityManager.flush();
        entityManager.clear();

        org.junit.jupiter.api.Assertions.assertTrue(invoiceRepository.findById(invoiceId).isEmpty(),
                "Deleting a project must cascade-delete its invoices.");
    }

    // --- Rule 5: Roles are data, not permissions — a custom, admin-created
    // role name that isn't one of the six well-known names must grant
    // access to nothing, anywhere in the app. ---
    @Test
    void customRoleGrantsNoAccessAnywhere() throws Exception {
        Role customRole = new Role();
        customRole.setName("COFFEE_FETCHER_" + System.nanoTime());
        customRole = roleRepository.save(customRole);

        User userWithCustomRole = createUser(
                "custom-role-" + System.nanoTime() + "@test.local",
                Set.of(customRole), true, null
        );
        String token = tokenFor(userWithCustomRole);

        mockMvc.perform(get("/api/projects")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()); // read access is open to any authenticated user

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"code\":\"X\",\"name\":\"X\",\"status\":\"WORKING\"}"))
                .andExpect(status().isForbidden()); // but mutation requires the real ADMIN role
    }

    // --- Rule 6 (F-10): An invoice that has been submitted to finance
    // (carries a list no.) or has a completed goods-received record must
    // never be hard-deletable — only a formal cancel is allowed once either
    // has happened, so the record and the finance batch total survive. ---
    @Test
    void invoiceDelete_blockedOnceSubmittedToFinanceOrGrnReceived() throws Exception {
        Role procurementRole = roleRepository.findByNameIgnoreCase("PROCUREMENT").orElseThrow();
        Project project = createProject("DELF10-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-DELF10-" + System.nanoTime());
        User procurementUser = createUser(
                "procurement-" + System.nanoTime() + "@test.local", Set.of(procurementRole), true, null);
        String token = tokenFor(procurementUser);

        // Plain, untouched invoice: hard delete is still allowed (data-entry mistakes).
        Invoice plainInvoice = createInvoice(project, supplier, procurementUser, null);
        mockMvc.perform(delete("/api/invoices/" + plainInvoice.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // GRN received: delete must be blocked.
        Invoice grnInvoice = createInvoice(project, supplier, procurementUser, "GRN-F10");
        grnInvoice.setGrnReceivedDate(LocalDate.now());
        invoiceRepository.save(grnInvoice);
        mockMvc.perform(delete("/api/invoices/" + grnInvoice.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertTrue(invoiceRepository.findById(grnInvoice.getId()).isPresent(),
                "An invoice with a completed GRN must survive a delete attempt.");

        // Submitted to finance: delete must be blocked.
        Invoice submittedInvoice = createInvoice(project, supplier, procurementUser, null);
        submittedInvoice.setListNo("LIST-F10-" + System.nanoTime());
        invoiceRepository.save(submittedInvoice);
        mockMvc.perform(delete("/api/invoices/" + submittedInvoice.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertTrue(invoiceRepository.findById(submittedInvoice.getId()).isPresent(),
                "An invoice submitted to finance must survive a delete attempt.");
    }

    // --- F-13: every invoice mutation must produce an append-only audit row,
    // readable only by ADMIN, and the row must survive even a hard delete of
    // the invoice it describes. ---
    @Test
    void invoiceAuditLog_recordsChangesAndIsAdminOnly() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        Role procurementRole = roleRepository.findByNameIgnoreCase("PROCUREMENT").orElseThrow();
        User admin = createUser("audit-admin-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        User procurementUser = createUser(
                "audit-proc-" + System.nanoTime() + "@test.local", Set.of(procurementRole), true, null);
        Project project = createProject("AUDITTEST-" + System.nanoTime());
        Supplier supplier = createSupplier("BP-AUDIT-" + System.nanoTime());

        Invoice invoice = createInvoice(project, supplier, procurementUser, null);
        Long invoiceId = invoice.getId();

        String adminToken = tokenFor(admin);
        String procurementToken = tokenFor(procurementUser);

        // A non-admin (even one who can fully manage invoices) must not be able to read the trail.
        mockMvc.perform(get("/api/audit-log/invoices")
                        .param("invoiceId", String.valueOf(invoiceId))
                        .header("Authorization", "Bearer " + procurementToken))
                .andExpect(status().isForbidden());

        // Plain, untouched invoice -> hard delete is allowed (data-entry mistakes).
        mockMvc.perform(delete("/api/invoices/" + invoiceId)
                        .header("Authorization", "Bearer " + procurementToken))
                .andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertTrue(invoiceRepository.findById(invoiceId).isEmpty());

        // The audit row must survive the invoice it describes, and record who did it.
        mockMvc.perform(get("/api/audit-log/invoices")
                        .param("invoiceId", String.valueOf(invoiceId))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].action").value("DELETE"))
                .andExpect(jsonPath("$.content[0].performedByUserId").value(procurementUser.getId()));
    }

    // --- Rule 9 (F-04): A token must stop working the moment the user is
    // deactivated, demoted, changes their password or logs out — not when
    // it happens to expire up to 10 hours later. ---

    @Test
    void deactivatedUsersExistingTokenIsRejected() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        User user = createUser("deactivated-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        String token = tokenFor(user);

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        user.setActive(false);
        entityManager.flush(); // not save(): merge chokes on the immutable Set.of roles

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authoritiesComeFromDatabaseNotTokenClaims() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        Role procurementRole = roleRepository.findByNameIgnoreCase("PROCUREMENT").orElseThrow();
        User user = createUser("demoted-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        String token = tokenFor(user); // roles claim still says ADMIN

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Demote without bumping token_version: the stale ADMIN claim in the
        // token must still not grant admin access.
        user.setRoles(new HashSet<>(Set.of(procurementRole)));
        entityManager.flush();

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminRoleChangeRevokesTargetsTokens() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        Role procurementRole = roleRepository.findByNameIgnoreCase("PROCUREMENT").orElseThrow();
        User admin = createUser("admin-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        User target = createUser("target-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        String targetToken = tokenFor(target);

        String body = objectMapper.writeValueAsString(java.util.Map.of(
            "name", target.getName(),
            "email", target.getEmail(),
            "allProjects", true,
            "roleIds", java.util.List.of(procurementRole.getId())
        ));
        mockMvc.perform(put("/api/users/" + target.getId())
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + targetToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesTokenServerSide() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        User user = createUser("logout-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        String token = tokenFor(user);

        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // A replayed copy of the logged-out token is dead.
        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());

        // A fresh login still works.
        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + tokenFor(reloaded)))
                .andExpect(status().isOk());
    }

    @Test
    void ownPasswordChangeRevokesExistingTokens() throws Exception {
        Role adminRole = roleRepository.findByNameIgnoreCase("ADMIN").orElseThrow();
        User user = createUser("pwchange-" + System.nanoTime() + "@test.local", Set.of(adminRole), true, null);
        String token = tokenFor(user);

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"password\":\"NewPassw0rd\"}"))
                .andExpect(status().isOk());
        entityManager.flush();

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
