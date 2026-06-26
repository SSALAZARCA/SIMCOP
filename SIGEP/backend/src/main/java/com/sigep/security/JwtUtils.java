package com.sigep.security;

import io.jsonwebtoken.*;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtils {
    private final String jwtSecret = "SigepSecretKeyForMilitaryPersonnelManagementVerySecureKey20261234567890";
    private final int jwtExpirationMs = 86400000; // 24 hours

    public String generateJwtToken(String username, String role, String unitId) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .claim("unitId", unitId)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(SignatureAlgorithm.HS256, jwtSecret.getBytes())
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser().setSigningKey(jwtSecret.getBytes()).parseClaimsJws(token).getBody().getSubject();
    }
    
    public String getRoleFromJwtToken(String token) {
        return Jwts.parser().setSigningKey(jwtSecret.getBytes()).parseClaimsJws(token).getBody().get("role", String.class);
    }
    
    public String getUnitIdFromJwtToken(String token) {
        return Jwts.parser().setSigningKey(jwtSecret.getBytes()).parseClaimsJws(token).getBody().get("unitId", String.class);
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().setSigningKey(jwtSecret.getBytes()).parseClaimsJws(authToken);
            return true;
        } catch (Exception e) {
            System.err.println("Invalid JWT: " + e.getMessage());
        }
        return false;
    }
}
