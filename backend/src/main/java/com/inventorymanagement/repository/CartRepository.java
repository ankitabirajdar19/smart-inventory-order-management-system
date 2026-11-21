package com.inventorymanagement.repository;

import com.inventorymanagement.entity.Cart;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartRepository extends JpaRepository<Cart, Long> {
    @Query("select distinct c from Cart c left join fetch c.items i left join fetch i.product where c.userId = :uid")
    Optional<Cart> findWithItemsByUserId(@Param("uid") Long userId);
}
