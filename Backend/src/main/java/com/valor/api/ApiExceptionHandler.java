package com.valor.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ApiResponse<Map<String,String>> response(ResponseStatusException ex) { int status=ex.getStatusCode().value(); return new ApiResponse<>(false,ex.getReason()==null?"Request failed":ex.getReason(),Map.of("error",ex.getReason()==null?"Request failed":ex.getReason()),java.time.OffsetDateTime.now(),status); }
    @ExceptionHandler(Exception.class)
    public ApiResponse<Map<String,String>> unexpected(Exception ex) { return new ApiResponse<>(false,"Server error",Map.of("error","Unexpected server error"),java.time.OffsetDateTime.now(), HttpStatus.INTERNAL_SERVER_ERROR.value()); }
}
