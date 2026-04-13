import { appStorage } from "./storage";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";

interface VaultDocument {
  id: string;
  name: string;
  encryptedData: string;
  watermarkedImage?: string;        // Store watermarked version for preview
  cloudinaryUrl?: string;
  metadata: {
    timestamp: number;
    original_name: string;
    size: number;
    checksum: string;
    watermarked?: boolean;
    ownerId?: string;
  };
  createdAt: string;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

/**
 * Get user-specific vault storage key
 */
const getVaultStorageKey = (userId: string): string => `pinit_vault_documents_${userId}`;

/**
 * Load vault documents from localStorage (user-specific)
 * Validates that documents belong to the current user
 */
export async function loadVaultDocuments(userId: string): Promise<VaultDocument[]> {
  if (!userId) {
    console.warn("⚠️ No userId provided, cannot load vault");
    return [];
  }

  const VAULT_STORAGE_KEY = getVaultStorageKey(userId);

  try {
    // Try appStorage first (Capacitor)
    const stored = await appStorage.getItem(VAULT_STORAGE_KEY);
    if (stored) {
      console.log(`✅ Loaded vault from appStorage for user: ${userId}`);
      const documents = JSON.parse(stored) as VaultDocument[];
      // Validate documents belong to this user
      return await validateDocumentsForUser(userId, documents);
    }
  } catch (e) {
    console.log("appStorage unavailable, trying localStorage");
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(VAULT_STORAGE_KEY);
    if (stored) {
      console.log(`✅ Loaded vault from localStorage for user: ${userId}`);
      const documents = JSON.parse(stored) as VaultDocument[];
      // Validate documents belong to this user
      return await validateDocumentsForUser(userId, documents);
    }
  } catch (e) {
    console.error("Failed to load vault documents:", e);
  }

  return [];
}

/**
 * Save vault documents to both localStorage and appStorage (user-specific)
 */
export async function saveVaultDocuments(
  userId: string,
  documents: VaultDocument[]
): Promise<void> {
  if (!userId) {
    console.error("❌ No userId provided, cannot save vault");
    return;
  }

  const VAULT_STORAGE_KEY = getVaultStorageKey(userId);
  const data = JSON.stringify(documents);

  // Save to localStorage (browser)
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, data);
    console.log(`✅ Vault saved to localStorage for user: ${userId}`);
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }

  // Save to appStorage (Capacitor)
  try {
    await appStorage.setItem(VAULT_STORAGE_KEY, data);
    console.log(`✅ Vault saved to appStorage for user: ${userId}`);
  } catch (e) {
    console.error("Failed to save to appStorage:", e);
  }
}

/**
 * Clear vault data for a specific user (called on logout)
 */
export async function clearVaultForUser(userId: string): Promise<void> {
  if (!userId) {
    console.warn("⚠️ No userId provided, cannot clear vault");
    return;
  }

  const VAULT_STORAGE_KEY = getVaultStorageKey(userId);

  // Clear from localStorage
  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
    console.log(`✅ Vault cleared from localStorage for user: ${userId}`);
  } catch (e) {
    console.error("Failed to clear vault from localStorage:", e);
  }

  // Clear from appStorage (Capacitor)
  try {
    await appStorage.removeItem(VAULT_STORAGE_KEY);
    console.log(`✅ Vault cleared from appStorage for user: ${userId}`);
  } catch (e) {
    console.error("Failed to clear vault from appStorage:", e);
  }
}

/**
 * Upload encrypted image to Cloudinary via backend
 */
export async function uploadImageToCloudinary(
  base64Data: string,
  fileName: string,
  userId: string,
  fileSize: number,
  checksum: string
): Promise<{ success: boolean; cloudinaryUrl?: string; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/vault/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        asset_id: `${userId}_${Date.now()}`,
        file_name: fileName,
        file_size: fileSize,
        image_base64: base64Data,
        thumbnail_base64: base64Data, // Same as image for encrypted data
        file_hash: checksum,
        visual_fingerprint: checksum,
        blockchain_anchor: checksum,
        resolution: "encrypted",
        owner_name: userId,
        owner_email: userId,
        certificate_id: "pinit_vault",
        capture_timestamp: new Date().toISOString(),
      }),
    });

    const result = await response.json();
    console.log("✅ Cloudinary upload response:", result);

    if (response.ok && result.image_url) {
      return {
        success: true,
        cloudinaryUrl: result.image_url,
      };
    } else {
      // Even if Cloudinary fails, we can still store locally
      console.warn("⚠️ Cloudinary upload failed, will use local storage");
      return {
        success: false,
        error: result.detail || "Cloudinary upload failed",
      };
    }
  } catch (error) {
    console.error("❌ Upload error:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Add document to vault (local storage) - user-specific
 */
export async function addDocumentToVault(userId: string, document: VaultDocument): Promise<void> {
  const documents = await loadVaultDocuments(userId);
  documents.unshift(document); // Add to beginning
  await saveVaultDocuments(userId, documents);
}

/**
 * Remove document from vault - user-specific
 */
export async function deleteDocumentFromVault(userId: string, docId: string): Promise<void> {
  let documents = await loadVaultDocuments(userId);
  documents = documents.filter((doc) => doc.id !== docId);
  await saveVaultDocuments(userId, documents);
}

/**
 * Get all vault documents - user-specific
 */
export async function getVaultDocuments(userId: string): Promise<VaultDocument[]> {
  return await loadVaultDocuments(userId);
}

/**
 * Validate that documents belong to the current user
 * Returns only documents with matching ownerId
 */
export async function validateDocumentsForUser(
  userId: string,
  documents: VaultDocument[]
): Promise<VaultDocument[]> {
  if (!userId) {
    console.warn("⚠️ No userId provided, cannot validate documents");
    return [];
  }

  const validated = documents.filter((doc) => {
    const docOwnerId = doc.metadata?.ownerId;
    if (docOwnerId && docOwnerId !== userId) {
      console.warn(
        `⚠️ Skipping document '${doc.name}' - belongs to user: ${docOwnerId}, not ${userId}`
      );
      return false;
    }
    return true;
  });

  if (validated.length < documents.length) {
    console.log(
      `✅ Filtered ${documents.length - validated.length} documents that don't belong to this user`
    );
  }

  return validated;
}

/**
 * Get vault metadata for the user (includes storage status and stats)
 */
export async function getVaultMetadata(
  userId: string
): Promise<{
  userVaultSize: number;
  documentCount: number;
  lastSyncTime: number;
  storageType: "appStorage" | "localStorage" | "both" | "none";
  ownerId: string;
}> {
  if (!userId) {
    return {
      userVaultSize: 0,
      documentCount: 0,
      lastSyncTime: 0,
      storageType: "none",
      ownerId: userId,
    };
  }

  const VAULT_STORAGE_KEY = getVaultStorageKey(userId);
  let storageType: "appStorage" | "localStorage" | "both" | "none" = "none";
  let vaultData = "";

  // Check appStorage
  try {
    const appStorageData = await appStorage.getItem(VAULT_STORAGE_KEY);
    if (appStorageData) {
      storageType = "appStorage";
      vaultData = appStorageData;
    }
  } catch (e) {
    console.log("appStorage unavailable for metadata check");
  }

  // Check localStorage
  try {
    const localStorageData = localStorage.getItem(VAULT_STORAGE_KEY);
    if (localStorageData) {
      if (storageType === "appStorage") {
        storageType = "both";
      } else {
        storageType = "localStorage";
      }
      if (!vaultData) vaultData = localStorageData;
    }
  } catch (e) {
    console.log("localStorage unavailable for metadata check");
  }

  let userVaultSize = 0;
  let documentCount = 0;

  if (vaultData) {
    try {
      const documents = JSON.parse(vaultData) as VaultDocument[];
      documentCount = documents.length;
      userVaultSize = new Blob([vaultData]).size;
    } catch (e) {
      console.error("Failed to parse vault data for metadata:", e);
    }
  }

  return {
    userVaultSize,
    documentCount,
    lastSyncTime: Date.now(),
    storageType,
    ownerId: userId,
  };
}

/**
 * Save watermarked image to device gallery in "PINIT Vault" folder
 * Works on Android, iOS, and web
 */
export async function saveImageToGallery(
  base64Data: string,
  fileName: string,
  userId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    console.log("📷 Starting gallery save process...");
    
    // Remove data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    
    const timestamp = Date.now();
    const uniqueName = `PINIT_${userId.substring(0, 8)}_${timestamp}.jpg`;
    const folderPath = "PINIT Vault";

    try {
      // Try to create "PINIT Vault" folder in Pictures directory
      try {
        await Filesystem.mkdir({
          path: folderPath,
          directory: Directory.Pictures,
          recursive: true,
        });
        console.log(`✅ PINIT Vault folder ready`);
      } catch (mkdirErr) {
        console.log("ℹ️ Folder creation info (may already exist):", mkdirErr);
      }

      // Save with proper base64 encoding (Capacitor's format)
      const fullPath = `${folderPath}/${uniqueName}`;
      console.log(`💾 Writing file to: ${fullPath}`);
      
      const result = await Filesystem.writeFile({
        path: fullPath,
        data: cleanBase64,  // Base64 string directly
        directory: Directory.Pictures,
        encoding: Encoding.UTF8,  // UTF8 handles base64 strings
      });

      console.log(`✅ Image successfully saved to PINIT Vault: ${uniqueName}`);
      console.log(`📂 Full path: ${result.uri}`);
      return {
        success: true,
        path: result.uri,
      };
    } catch (e) {
      console.warn("⚠️ PINIT Vault subfolder save failed, trying direct Pictures...", e);
      
      // Fallback: Try saving directly to Pictures root
      try {
        const fallbackResult = await Filesystem.writeFile({
          path: uniqueName,
          data: cleanBase64,
          directory: Directory.Pictures,
          encoding: Encoding.UTF8,
        });
        
        console.log(`✅ Image saved to Pictures root (fallback): ${uniqueName}`);
        console.log(`📂 Full path: ${fallbackResult.uri}`);
        return {
          success: true,
          path: fallbackResult.uri,
        };
      } catch (fallbackErr) {
        console.warn("⚠️ Direct Pictures save also failed:", fallbackErr);
        
        // Final fallback: Try Documents directory
        try {
          const docResult = await Filesystem.writeFile({
            path: uniqueName,
            data: cleanBase64,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });
          
          console.log(`✅ Image saved to Documents (final fallback): ${uniqueName}`);
          return {
            success: true,
            path: docResult.uri,
          };
        } catch (docErr) {
          console.error("❌ All filesystem save attempts failed:", docErr);
          return {
            success: false,
            error: `Filesystem save failed: ${String(docErr)}`,
          };
        }
      }
    }
  } catch (error) {
    console.error("❌ Gallery save error:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Sync vault metadata to prevent image loading failures
 * Ensures document references are valid
 */
export async function syncVaultMetadata(userId: string): Promise<void> {
  if (!userId) return;

  const VAULT_STORAGE_KEY = getVaultStorageKey(userId);

  try {
    // Load current vault
    const stored = await appStorage.getItem(VAULT_STORAGE_KEY);
    if (!stored) return;

    const documents = JSON.parse(stored) as VaultDocument[];

    // Validate each document has required fields
    const validatedDocs = documents.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        ownerId: doc.metadata.ownerId || userId, // Ensure ownerId is set
      },
    }));

    // Re-save synced documents
    await appStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(validatedDocs));
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(validatedDocs));

    console.log(`✅ Vault metadata synced for user: ${userId}`);
  } catch (e) {
    console.error("Failed to sync vault metadata:", e);
  }
}

/**
 * Sync vault data between appStorage and localStorage
 * Ensures both stores have the same data
 */
export async function syncVaultData(userId: string): Promise<boolean> {
  if (!userId) {
    console.warn("⚠️ No userId provided, cannot sync vault data");
    return false;
  }

  const VAULT_STORAGE_KEY = getVaultStorageKey(userId);

  try {
    // Load from primary source (appStorage preferred)
    let primaryData: string | null = null;
    let fromAppStorage = false;

    try {
      primaryData = await appStorage.getItem(VAULT_STORAGE_KEY);
      if (primaryData) fromAppStorage = true;
    } catch (e) {
      console.log("appStorage not available, using localStorage as primary");
    }

    if (!primaryData) {
      try {
        primaryData = localStorage.getItem(VAULT_STORAGE_KEY);
      } catch (e) {
        console.error("Failed to sync: no data found in either storage");
        return false;
      }
    }

    if (!primaryData) {
      console.log("No vault data to sync");
      return true;
    }

    // Validate JSON
    JSON.parse(primaryData);

    // Write to both stores
    if (!fromAppStorage) {
      try {
        await appStorage.setItem(VAULT_STORAGE_KEY, primaryData);
        console.log(`✅ Synced vault data from localStorage to appStorage for user: ${userId}`);
      } catch (e) {
        console.error("Failed to sync to appStorage:", e);
      }
    }

    try {
      localStorage.setItem(VAULT_STORAGE_KEY, primaryData);
      if (fromAppStorage) {
        console.log(`✅ Synced vault data from appStorage to localStorage for user: ${userId}`);
      }
    } catch (e) {
      console.error("Failed to sync to localStorage:", e);
    }

    return true;
  } catch (e) {
    console.error("Vault sync error:", e);
    return false;
  }
}
