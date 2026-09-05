package com.sigep.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtils {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${sigep.jwt.secret:${JWT_SECRET:SigepSecretKeyForMilitaryPersonnelManagementVerySecureKey20261234567890}}")
    private String jwtSecret;

    @Value("${sigep.jwt.expiration:86400000}")
    private int jwtExpirationMs = 86400000; // 24 hours

    private Key signingKey;
    private JwtParser jwtParser;

    @PostConstruct
    public void init() {
        if (jwtSecret != null && !jwtSecret.isBlank()) {
            this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            this.jwtParser = Jwts.parserBuilder().setSigningKey(this.signingKey).build();
        }
    }

    private Key getSigningKey() {
        if (this.signingKey == null) {
            byte[] keyBytes = (this.jwtSecret != null && !this.jwtSecret.isBlank() ? this.jwtSecret : "SigepSecretKeyForMilitaryPersonnelManagementVerySecureKey20261234567890")
                    .getBytes(StandardCharsets.UTF_8);
            this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        }
        return this.signingKey;
    }

    private JwtParser getJwtParser() {
        if (this.jwtParser == null) {
            this.jwtParser = Jwts.parserBuilder().setSigningKey(getSigningKey()).build();
        }
        return this.jwtParser;
    }

    public String generateJwtToken(String username, String role, String unitId) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .claim("unitId", unitId)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims getClaimsFromJwtToken(String token) {
        return getJwtParser().parseClaimsJws(token).getBody();
    }

    public String getUserNameFromJwtToken(String token) {
        return getClaimsFromJwtToken(token).getSubject();
    }
    
    public String getRoleFromJwtToken(String token) {
        return getClaimsFromJwtToken(token).get("role", String.class);
    }
    
    public String getUnitIdFromJwtToken(String token) {
        return getClaimsFromJwtToken(token).get("unitId", String.class);
    }

    public boolean validateJwtToken(String authToken) {
        try {
            getJwtParser().parseClaimsJws(authToken);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            logger.error("Firma o estructura de token JWT inválida: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.warn("Token JWT expirado: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("Token JWT no soportado: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("Claims de token JWT vacíos o nulos: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("Fallo inesperado al validar token JWT: {}", e.getMessage());
        }
        return false;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
        if (jwtSecret != null && !jwtSecret.isBlank()) {
            this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            this.jwtParser = Jwts.parserBuilder().setSigningKey(this.signingKey).build();
        }
    }

    public void setJwtExpirationMs(int jwtExpirationMs) {
        this.jwtExpirationMs = jwtExpirationMs;
    }
}

