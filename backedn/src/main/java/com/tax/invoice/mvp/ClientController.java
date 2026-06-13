package com.tax.invoice.mvp;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
public class ClientController {
    private final MvpStore store;

    public ClientController(MvpStore store) {
        this.store = store;
    }

    @GetMapping
    @PreAuthorize("hasRole('CA_SUPER_ADMIN')")
    public List<ClientAccount> allClients() {
        return store.clients();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('CLIENT_ADMIN','CUSTOMER')")
    public ClientAccount myClient(Authentication authentication) {
        AppUser user = (AppUser) authentication.getPrincipal();
        return store.client(user.clientId()).orElseThrow();
    }
}
