package com.tax.invoice.mvp;

import com.tax.invoice.mvp.dto.AuthDtos.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private final MvpStore store;
    private final Map<String, AppUser> sessions = new ConcurrentHashMap<>();

    public AuthService(MvpStore store) {
        this.store = store;
    }

    public AppUser login(String email, String password) {
        AppUser user = store.findUserByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid login"));
        if (!user.password().equals(password)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid login");
        }
        return user;
    }

    public AppUser register(String name, String email, String password, Role role, Long clientId) {
        store.findUserByEmail(email).ifPresent(user -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        });
        if ((role == Role.CLIENT_ADMIN || role == Role.CUSTOMER) && clientId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client users need a client account");
        }
        return store.saveUser(name, email, password, role, clientId, "password");
    }

    public AppUser oauthLogin(String provider, String email, String name) {
        return store.findUserByEmail(email)
                .orElseGet(() -> store.saveUser(name, email, "", Role.CLIENT_ADMIN, 1L, provider.toLowerCase()));
    }

    public String issueToken(AppUser user) {
        String raw = "%s:%s:%s".formatted(user.id(), Instant.now(), UUID.randomUUID());
        String token = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
        sessions.put(token, user);
        return token;
    }

    public Optional<AppUser> userForToken(String token) {
        return Optional.ofNullable(sessions.get(token));
    }

    public UserResponse toResponse(AppUser user) {
        return new UserResponse(user.id(), user.name(), user.email(), user.role(), user.clientId(), user.authProvider());
    }
}
