// Custom service worker extensions for NoteMaster
// This file is merged with the next-pwa generated service worker

// Background Sync handler
self.addEventListener("sync", (event) => {
  if (event.tag === "notemaster-sync") {
    event.waitUntil(syncPendingOperations());
  }
});

// Process pending sync operations
async function syncPendingOperations() {
  try {
    // Open IndexedDB
    const db = await openDatabase();
    const operations = await getPendingOperations(db);
    
    for (const op of operations) {
      try {
        await processOperation(op);
        await removeOperation(db, op.id);
      } catch (error) {
        console.error("Sync operation failed:", op.id, error);
        // Will retry on next sync
      }
    }
    
    // Notify the client about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_COMPLETE",
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Open IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("notemaster", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Get all pending operations
function getPendingOperations(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingSync", "readonly");
    const store = tx.objectStore("pendingSync");
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Remove a completed operation
function removeOperation(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingSync", "readwrite");
    const store = tx.objectStore("pendingSync");
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Process a single operation
async function processOperation(op) {
  const { type, entity, entityId, data } = op;
  const baseUrl = self.location.origin;
  
  let url, method, body;
  
  if (entity === "note") {
    switch (type) {
      case "create":
        url = `${baseUrl}/api/notes`;
        method = "POST";
        body = JSON.stringify(data);
        break;
      case "update":
        url = `${baseUrl}/api/notes/${entityId}`;
        method = "PATCH";
        body = JSON.stringify(data);
        break;
      case "delete":
        url = `${baseUrl}/api/notes/${entityId}`;
        method = "DELETE";
        break;
    }
  } else if (entity === "notebook") {
    switch (type) {
      case "create":
        url = `${baseUrl}/api/notebooks`;
        method = "POST";
        body = JSON.stringify(data);
        break;
      case "update":
        url = `${baseUrl}/api/notebooks/${entityId}`;
        method = "PATCH";
        body = JSON.stringify(data);
        break;
      case "delete":
        url = `${baseUrl}/api/notebooks/${entityId}`;
        method = "DELETE";
        break;
    }
  }
  
  if (!url) {
    throw new Error(`Unknown operation: ${entity}/${type}`);
  }
  
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body,
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_SYNC") {
    // Trigger immediate sync
    syncPendingOperations();
  }
});

// Periodic sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "notemaster-periodic-sync") {
    event.waitUntil(syncPendingOperations());
  }
});
