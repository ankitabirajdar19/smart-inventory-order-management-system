package com.inventorymanagement.storage;

import com.inventorymanagement.config.AppProperties;
import java.io.IOException;
import java.nio.file.*;
import org.springframework.stereotype.Component;

@Component
public class LocalFileStorage implements FileStorage {
    private final Path root;

    public LocalFileStorage(AppProperties props) throws IOException {
        this.root = Path.of(props.storage().localDir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Override
    public String store(String key, byte[] data) throws IOException {
        Path target = resolve(key);
        Files.write(target, data, StandardOpenOption.CREATE_NEW);
        return key;
    }

    @Override
    public void delete(String key) throws IOException { Files.deleteIfExists(resolve(key)); }

    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new IllegalArgumentException("Invalid storage key");   // path traversal guard
        return p;
    }
}
