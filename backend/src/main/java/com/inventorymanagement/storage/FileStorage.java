package com.inventorymanagement.storage;

import java.io.IOException;

/** Storage abstraction: swap LocalFileStorage for S3/GCS without touching callers. */
public interface FileStorage {
    String store(String key, byte[] data) throws IOException;
    void delete(String key) throws IOException;
}
