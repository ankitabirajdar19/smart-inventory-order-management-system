package com.inventorymanagement.service;

import com.inventorymanagement.entity.AuditLog;
import com.inventorymanagement.repository.AuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository repo;
    private final ObjectMapper mapper;

    /** Joins the caller's transaction, so the audit row commits or rolls back with the change it describes. */
    @Transactional
    public void record(Long userId, String action, String module, Object entityId, Object oldValue, Object newValue) {
        AuditLog a = new AuditLog();
        a.setUserId(userId);
        a.setAction(action);
        a.setModule(module);
        a.setEntityId(entityId == null ? null : String.valueOf(entityId));
        a.setOldValue(json(oldValue));
        a.setNewValue(json(newValue));
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes sra) {
            HttpServletRequest r = sra.getRequest();
            a.setIpAddress(r.getRemoteAddr());
        }
        repo.save(a);
    }

    private String json(Object o) {
        if (o == null) return null;
        try { return mapper.writeValueAsString(o); } catch (JsonProcessingException e) { return String.valueOf(o); }
    }
}
