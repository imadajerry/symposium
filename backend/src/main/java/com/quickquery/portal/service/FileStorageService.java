package com.quickquery.portal.service;

import com.quickquery.portal.config.QuickQueryProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {
  private static final Set<String> ALLOWED_TYPES = Set.of(
      "text/plain",
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/gif",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  private final Path uploadRoot;

  public FileStorageService(QuickQueryProperties properties) {
    this.uploadRoot = Path.of(properties.uploadDir()).toAbsolutePath().normalize();
  }

  public StoredFile store(UUID subjectId, MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("File is required");
    }
    String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
    if (!ALLOWED_TYPES.contains(contentType)) {
      throw new IllegalArgumentException("Unsupported file type: " + contentType);
    }
    try {
      Path subjectDir = uploadRoot.resolve(subjectId.toString()).normalize();
      Files.createDirectories(subjectDir);
      String safeName = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename().replaceAll("[^A-Za-z0-9._-]", "_");
      Path target = subjectDir.resolve(UUID.randomUUID() + "-" + safeName).normalize();
      if (!target.startsWith(subjectDir)) {
        throw new IllegalArgumentException("Invalid file name");
      }
      file.transferTo(target);
      return new StoredFile(safeName, contentType, target.toString(), extractText(file, contentType));
    } catch (IOException e) {
      throw new IllegalStateException("Failed to store file", e);
    }
  }

  private String extractText(MultipartFile file, String contentType) throws IOException {
    if ("text/plain".equals(contentType)) {
      return new String(file.getBytes(), StandardCharsets.UTF_8);
    }
    if ("application/pdf".equals(contentType)) {
      try (InputStream is = file.getInputStream();
           var document = Loader.loadPDF(is.readAllBytes())) {
        PDFTextStripper stripper = new PDFTextStripper();
        String text = stripper.getText(document);
        return text == null || text.isBlank()
            ? "PDF uploaded: " + file.getOriginalFilename() + " (no extractable text found — may be scanned/image-based)"
            : text;
      } catch (Exception e) {
        return "PDF uploaded: " + file.getOriginalFilename() + " (text extraction failed: " + e.getMessage() + ")";
      }
    }
    if (contentType.startsWith("image/")) {
      return "Image uploaded: " + file.getOriginalFilename() + ". Add OCR for richer LLM context.";
    }
    return "File uploaded: " + file.getOriginalFilename();
  }

  public record StoredFile(String fileName, String contentType, String storagePath, String extractedText) {}
}
