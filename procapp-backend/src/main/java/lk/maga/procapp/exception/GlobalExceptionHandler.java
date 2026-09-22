package lk.maga.procapp.exception;

import lk.maga.procapp.dto.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex) {
        ApiError error = new ApiError(ex.getReason(), ex.getStatusCode().value(), null);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleBeanValidation(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new java.util.HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe ->
                fieldErrors.put(fe.getField(), fe.getDefaultMessage())
        );
        ApiError error = new ApiError("Validation failed", 422, fieldErrors);
        return ResponseEntity.status(422).body(error);
    }

    @ExceptionHandler(lk.maga.procapp.exception.ValidationException.class)
    public ResponseEntity<ApiError> handleValidation(lk.maga.procapp.exception.ValidationException ex) {
        ApiError error = new ApiError("Validation failed", 422, ex.getFieldErrors());
        return ResponseEntity.status(422).body(error);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        ApiError error = new ApiError("Access denied", 403, null);
        return ResponseEntity.status(403).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        ApiError error = new ApiError("Internal server error", 500, null);
        return ResponseEntity.status(500).body(error);
    }
}