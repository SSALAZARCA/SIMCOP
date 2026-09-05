package com.sigep.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class AuthTokenFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 1. Verificación M2M desde SIMCOP
            final String serviceTokenHeader = request.getHeader("X-Service-Token");
            final String authHeader = request.getHeader("Authorization");
            final String envServiceToken = System.getenv("SIMCOP_SERVICE_TOKEN");
            final String expectedServiceToken = (envServiceToken != null && !envServiceToken.trim().isEmpty())
                    ? envServiceToken.trim()
                    : "simcop-tactical-m2m-secure-token-2026";

            boolean isM2MAuthorized = (serviceTokenHeader != null && serviceTokenHeader.equals(expectedServiceToken))
                    || (authHeader != null && authHeader.equals("Bearer " + expectedServiceToken));

            if (isM2MAuthorized && SecurityContextHolder.getContext().getAuthentication() == null) {
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        "simcop-service-m2m", null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")));
                authentication.setDetails("SIMCOP_M2M_INTEGRATION");
                SecurityContextHolder.getContext().setAuthentication(authentication);
                filterChain.doFilter(request, response);
                return;
            }

            // 2. Verificación estándar de usuario JWT
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUserNameFromJwtToken(jwt);
                String role = jwtUtils.getRoleFromJwtToken(jwt);
                String unitId = jwtUtils.getUnitIdFromJwtToken(jwt);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        username, null, Collections.singletonList(new SimpleGrantedAuthority(role)));
                
                WebAuthenticationDetailsSource source = new WebAuthenticationDetailsSource();
                authentication.setDetails(unitId); // Guardamos unitId en details directamente para facilitar

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            System.err.println("Cannot set user authentication: " + e);
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
