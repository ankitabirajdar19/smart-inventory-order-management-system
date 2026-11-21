package com.inventorymanagement.repository;

import com.inventorymanagement.entity.StockTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {}
