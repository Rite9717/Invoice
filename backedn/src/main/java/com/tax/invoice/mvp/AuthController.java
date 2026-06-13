package com.tax.invoice.mvp;

import com.tax.invoice.mvp.dto.AuthDtos.AuthResponse;
import com.tax.invoice.mvp.dto.AuthDtos.LoginRequest;
import com.tax.invoice.mvp.dto.AuthDtos.OAuthRequest;
import com.tax.invoice.mvp.dto.AuthDtos.RegisterRequest;
import com.tax.invoice.mvp.dto.AuthDtos.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AppUser user = authService.login(request.email(), request.password());
        return ResponseEntity.ok(new AuthResponse(authService.issueToken(user), authService.toResponse(user)));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        AppUser user = authService.register(request.name(), request.email(), request.password(),
                request.role() == null ? Role.CLIENT_ADMIN : request.role(), request.clientId());
        return ResponseEntity.ok(new AuthResponse(authService.issueToken(user), authService.toResponse(user)));
    }

    @PostMapping("/oauth/demo")
    public ResponseEntity<AuthResponse> oauthDemo(@RequestBody OAuthRequest request) {
        AppUser user = authService.oauthLogin(request.provider(), request.email(), request.name());
        return ResponseEntity.ok(new AuthResponse(authService.issueToken(user), authService.toResponse(user)));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.toResponse((AppUser) authentication.getPrincipal()));
    }
}
