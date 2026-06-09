package com.tax.invoice.login;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class Controller
{
    @GetMapping("/login")
    public ResponseEntity<?> login (@Valid @RequestBody loginDtos dto)
    {
        return ResponseEntity.ok("Logged inn successfully");
    }
}
