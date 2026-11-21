package com.inventorymanagement.controller;

import com.inventorymanagement.dto.ApiResponse;
import com.inventorymanagement.dto.DashboardDtos.DashboardSummary;
import com.inventorymanagement.service.DashboardService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboard;

    /** Defaults to the last 30 days (UTC). Max range 366 days. */
    @GetMapping("/summary") @PreAuthorize("hasAuthority('REPORT_VIEW')")
    public ApiResponse<DashboardSummary> summary(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(dashboard.summary(from, to));
    }
}
