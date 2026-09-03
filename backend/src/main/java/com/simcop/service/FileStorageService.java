package com.simcop.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${file.upload-dir:uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    private static final java.util.Set<String> ALLOWED_EXTENSIONS = java.util.Set.of(
            "jpg", "jpeg", "png", "gif", "webp", "pdf", "kml", "kmz", "json", "geojson",
            "txt", "csv", "doc", "docx", "xls", "xlsx"
    );

    public String storeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed");
        
        // Validate extension against strict allowlist
        int lastDotIndex = originalFileName.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == originalFileName.length() - 1) {
            throw new IllegalArgumentException("File must have a valid extension.");
        }

        String extension = originalFileName.substring(lastDotIndex + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File extension ." + extension + " is not permitted for upload.");
        }

        // Sanitize filename to remove dangerous characters but keep extension
        String baseName = originalFileName.substring(0, lastDotIndex).replaceAll("[^a-zA-Z0-9_-]", "_");
        if (baseName.isEmpty()) {
            baseName = "file";
        }
        String fileName = UUID.randomUUID().toString() + "_" + baseName + "." + extension;

        try {
            if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
                throw new SecurityException("Filename contains invalid path sequence: " + fileName);
            }

            Path targetLocation = this.fileStorageLocation.resolve(fileName).normalize();
            if (!targetLocation.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Target location outside upload directory.");
            }

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }

    public Resource loadFileAsResource(String fileName) {
        if (fileName == null || fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new SecurityException("Acceso denegado: Secuencia de escape o nombre inválido en " + fileName);
        }
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            if (!filePath.startsWith(this.fileStorageLocation.normalize())) {
                throw new SecurityException("Acceso denegado: Secuencia de escape de directorio detectada en " + fileName);
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + fileName, ex);
        }
    }
}
