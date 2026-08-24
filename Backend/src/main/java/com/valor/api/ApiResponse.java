package com.valor.api;

import java.time.OffsetDateTime;

public record ApiResponse<T>(boolean success, String message, T data, OffsetDateTime timestamp, int status) {
    public static <T> ApiResponse<T> ok(T data, String message) { return new ApiResponse<>(true, message, data, OffsetDateTime.now(), 200); }
    public static <T> ApiResponse<T> created(T data, String message) { return new ApiResponse<>(true, message, data, OffsetDateTime.now(), 201); }
}
