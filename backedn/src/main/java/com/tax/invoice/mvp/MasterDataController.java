package com.tax.invoice.mvp;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/master")
public class MasterDataController {
    private final MvpStore store;

    public MasterDataController(MvpStore store) {
        this.store = store;
    }

    @GetMapping("/products")
    public List<Product> products(Authentication authentication) {
        return store.productsForUser((AppUser) authentication.getPrincipal());
    }

    @GetMapping("/customers")
    public List<CustomerAccount> customers(Authentication authentication) {
        return store.customersForUser((AppUser) authentication.getPrincipal());
    }
}
