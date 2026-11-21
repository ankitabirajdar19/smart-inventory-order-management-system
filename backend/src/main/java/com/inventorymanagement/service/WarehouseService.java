package com.inventorymanagement.service;

import com.inventorymanagement.dto.InventoryDtos.*;
import com.inventorymanagement.entity.Warehouse;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.repository.WarehouseRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WarehouseService {
    private final WarehouseRepository repo;

    @Transactional(readOnly = true)
    public List<WarehouseResponse> list() { return repo.findAll().stream().map(this::toResponse).toList(); }

    @Transactional
    public WarehouseResponse create(WarehouseRequest r) {
        String code = r.code().trim().toUpperCase();
        if (repo.existsByCode(code)) throw new DuplicateResourceException("Warehouse code already exists");
        Warehouse w = new Warehouse();
        apply(w, r, code);
        return toResponse(repo.save(w));
    }

    @Transactional
    public WarehouseResponse update(Long id, WarehouseRequest r) {
        Warehouse w = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Warehouse not found"));
        String code = r.code().trim().toUpperCase();
        if (repo.existsByCodeAndIdNot(code, id)) throw new DuplicateResourceException("Warehouse code already exists");
        apply(w, r, code);
        return toResponse(w);
    }

    private void apply(Warehouse w, WarehouseRequest r, String code) {
        w.setName(r.name().trim()); w.setCode(code); w.setLocation(r.location()); w.setAddress(r.address());
        w.setContactNumber(r.contactNumber()); w.setManagerId(r.managerId()); w.setActive(r.active() == null || r.active());
    }

    private WarehouseResponse toResponse(Warehouse w) {
        return new WarehouseResponse(w.getId(), w.getName(), w.getCode(), w.getLocation(), w.getAddress(), w.getContactNumber(), w.getManagerId(), w.isActive());
    }
}
