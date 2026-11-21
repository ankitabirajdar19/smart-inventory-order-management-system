package com.inventorymanagement.service;

import com.inventorymanagement.dto.CartDtos.*;
import com.inventorymanagement.entity.Address;
import com.inventorymanagement.exception.ResourceNotFoundException;
import com.inventorymanagement.repository.AddressRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AddressService {
    private final AddressRepository repo;

    @Transactional(readOnly = true)
    public List<AddressResponse> list(Long userId) { return repo.findByUserIdAndDeletedAtIsNullOrderByIdDesc(userId).stream().map(this::toResponse).toList(); }

    @Transactional
    public AddressResponse create(Long userId, AddressRequest r) {
        boolean first = repo.findByUserIdAndDeletedAtIsNullOrderByIdDesc(userId).isEmpty();
        Address a = new Address();
        a.setUserId(userId);
        apply(a, r);
        if (first || Boolean.TRUE.equals(r.makeDefault())) { repo.clearDefault(userId); a.setDefaultAddress(true); }
        return toResponse(repo.save(a));
    }

    @Transactional
    public AddressResponse update(Long userId, Long id, AddressRequest r) {
        Address a = owned(userId, id);
        apply(a, r);
        if (Boolean.TRUE.equals(r.makeDefault())) { repo.clearDefault(userId); a.setDefaultAddress(true); }
        return toResponse(a);
    }

    @Transactional
    public AddressResponse makeDefault(Long userId, Long id) {
        Address a = owned(userId, id);
        repo.clearDefault(userId);
        a.setDefaultAddress(true);
        return toResponse(a);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Address a = owned(userId, id);
        a.setDeletedAt(java.time.Instant.now());
        a.setDefaultAddress(false);
    }

    /** Ownership is part of the query, so another user's address id is indistinguishable from a missing one. */
    private Address owned(Long userId, Long id) {
        return repo.findByIdAndUserIdAndDeletedAtIsNull(id, userId).orElseThrow(() -> new ResourceNotFoundException("Address not found"));
    }

    private void apply(Address a, AddressRequest r) {
        a.setFullName(r.fullName()); a.setPhone(r.phone()); a.setLine1(r.line1()); a.setLine2(r.line2()); a.setCity(r.city());
        a.setState(r.state()); a.setPostalCode(r.postalCode()); a.setCountry(r.country() == null || r.country().isBlank() ? "India" : r.country());
        a.setAddressType(r.addressType() == null ? "HOME" : r.addressType());
    }

    private AddressResponse toResponse(Address a) {
        return new AddressResponse(a.getId(), a.getFullName(), a.getPhone(), a.getLine1(), a.getLine2(), a.getCity(), a.getState(),
            a.getPostalCode(), a.getCountry(), a.getAddressType(), a.isDefaultAddress());
    }
}
