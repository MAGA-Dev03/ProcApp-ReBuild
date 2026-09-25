package lk.maga.procapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.UUID;

@Service
public class FileStorageService {

    /** Attachments are restricted to these types, identified by the bytes of the file
     * itself (not the filename/extension the client claims) so a renamed script or SVG
     * can't slip through and later get executed in a colleague's browser session. */
    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46}; // %PDF
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC =
            {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

    private final Path storageDir;

    public FileStorageService(@Value("${app.storage.attachments-dir}") String attachmentsDir) {
        this.storageDir = Paths.get(attachmentsDir);
        try {
            Files.createDirectories(this.storageDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create attachments directory: " + attachmentsDir, e);
        }
    }

    private static boolean startsWith(byte[] data, int length, byte[] magic) {
        return length >= magic.length && Arrays.equals(
                data, 0, magic.length, magic, 0, magic.length);
    }

    /** Sniffs the real file type from its content. Returns null for anything that
     * isn't a recognised, safe-to-serve type. */
    private static String detectSafeContentType(byte[] header, int length) {
        if (startsWith(header, length, PDF_MAGIC)) return "application/pdf";
        if (startsWith(header, length, JPEG_MAGIC)) return "image/jpeg";
        if (startsWith(header, length, PNG_MAGIC)) return "image/png";
        return null;
    }

    private static String extensionFor(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            default -> throw new IllegalStateException("Unhandled content type: " + contentType);
        };
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided");
        }

        byte[] header = new byte[8];
        int headerLength;
        try (InputStream in = file.getInputStream()) {
            headerLength = in.readNBytes(header, 0, header.length);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read file");
        }

        String contentType = detectSafeContentType(header, headerLength);
        if (contentType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported file type. Only PDF, JPEG, and PNG files are allowed.");
        }

        String storedKey = UUID.randomUUID() + extensionFor(contentType);
        Path target = storageDir.resolve(storedKey);

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");

        }

        return storedKey;
    }

    public Path resolve(String storedKey) {
        Path resolved = storageDir.resolve(storedKey).normalize();
        if (!resolved.startsWith(storageDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file reference");
        }
        if (!Files.exists(resolved)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found on disk");

        }
        return resolved;
    }
    
}
