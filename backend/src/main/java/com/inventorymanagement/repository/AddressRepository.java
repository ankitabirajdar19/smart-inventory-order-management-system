package com.inventorymanagement.repository;

import com.inventorymanagement.entity.Address;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserIdAndDeletedAtIsNullOrderByIdDesc(Long userId);
    Optional<Address> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Address a set a.defaultAddress = false where a.userId = :uid and a.defaultAddress = true")
    void clearDefault(@Param("uid") Long userId);
}
