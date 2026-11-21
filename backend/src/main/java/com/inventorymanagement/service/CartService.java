package com.inventorymanagement.service;

import com.inventorymanagement.dto.CartDtos.*;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.repository.*;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CartService {
    private final CartRepository carts;
    private final ProductRepository products;
    private final InventoryRepository inventory;
    private final PriceCalculator calculator;

    @Transactional
    public CartResponse get(Long userId) { return view(findOrCreate(userId)); }

    @Transactional
    public CartResponse addItem(Long userId, AddItemRequest r) {
        Product p = activeProduct(r.productId());
        Cart cart = findOrCreate(userId);
        CartItem existing = find(cart, p.getId());
        int qty = (existing == null ? 0 : existing.getQuantity()) + r.quantity();
        assertStock(p.getId(), qty);
        if (existing == null) {
            CartItem ci = new CartItem();
            ci.setCart(cart); ci.setProduct(p); ci.setQuantity(qty);
            cart.getItems().add(ci);
        } else existing.setQuantity(qty);
        return view(cart);
    }

    @Transactional
    public CartResponse updateQuantity(Long userId, Long itemId, int quantity) {
        Cart cart = findOrCreate(userId);
        CartItem ci = cart.getItems().stream().filter(i -> i.getId().equals(itemId)).findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));
        activeProduct(ci.getProduct().getId());
        assertStock(ci.getProduct().getId(), quantity);
        ci.setQuantity(quantity);
        return view(cart);
    }

    @Transactional
    public CartResponse removeItem(Long userId, Long itemId) {
        Cart cart = findOrCreate(userId);
        if (!cart.getItems().removeIf(i -> i.getId().equals(itemId))) throw new ResourceNotFoundException("Cart item not found");
        return view(cart);
    }

    @Transactional
    public void clear(Long userId) { findOrCreate(userId).getItems().clear(); }

    private Product activeProduct(Long id) {
        return products.findByIdAndDeletedAtIsNull(id).filter(Product::isActive)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found or unavailable"));
    }

    private void assertStock(Long productId, int qty) {
        int max = inventory.maxAvailable(productId);   // an order is fulfilled from a single warehouse
        if (qty > max) throw new InsufficientStockException(productId, qty, max);
    }

    private CartItem find(Cart c, Long productId) { return c.getItems().stream().filter(i -> i.getProduct().getId().equals(productId)).findFirst().orElse(null); }

    private Cart findOrCreate(Long userId) {
        return carts.findWithItemsByUserId(userId).orElseGet(() -> { Cart c = new Cart(); c.setUserId(userId); return carts.save(c); });
    }

    private CartResponse view(Cart cart) {
        List<CartItem> items = cart.getItems();
        Map<Long, Integer> stock = items.isEmpty() ? Map.of() : inventory.maxAvailableByProducts(items.stream().map(i -> i.getProduct().getId()).toList())
            .stream().collect(Collectors.toMap(a -> (Long) a[0], a -> ((Number) a[1]).intValue()));
        List<CartItemResponse> rows = items.stream().map(i -> {
            Product p = i.getProduct();
            var unit = PriceCalculator.unitPrice(p);
            return new CartItemResponse(i.getId(), p.getId(), p.getName(), p.getSku(), p.getPrice(), unit, p.getTaxRate(), i.getQuantity(),
                unit.multiply(java.math.BigDecimal.valueOf(i.getQuantity())), stock.getOrDefault(p.getId(), 0));
        }).toList();
        return new CartResponse(rows, calculator.calculate(items.stream().map(i -> new PriceCalculator.Line(i.getProduct(), i.getQuantity())).toList()));
    }
}
