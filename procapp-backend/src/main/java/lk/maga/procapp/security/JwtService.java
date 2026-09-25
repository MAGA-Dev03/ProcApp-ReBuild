package lk.maga.procapp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationHours;

    public JwtService(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration-hours}") long expirationHours
    ){
        // Refuse to boot with the placeholder from .env.example
        if (secret.startsWith("changeme")) {
            throw new IllegalStateException(
                "JWT_SECRET is still the .env.example placeholder; generate a real key");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationHours = expirationHours;
    }

    public String generateToken(CustomUserDetails userDetails) {
        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(expirationHours * 3600);

        List<String> roleNames = userDetails.getUser().getRoles().stream()
                .map(r -> r.getName())
                .collect(Collectors.toList());

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("userId", userDetails.getId())
                .claim("roles", roleNames)
                .claim("tv", userDetails.getUser().getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}