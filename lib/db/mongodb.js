import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/safirpass";
const dbName = process.env.MONGODB_DB_NAME || "safirpass";

let client = null;
let clientPromise = null;

// In-Memory resilient fallback store if local MongoDB daemon is not running
const inMemoryStore = {
  documents_vault: new Map(),
  biometric_face_logs: new Map(),
  authority_audit_logs: [],
  incident_telemetry: [],
};

export async function getMongoDb() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      try {
        client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000,
        });
        global._mongoClientPromise = client.connect();
      } catch (err) {
        console.warn("MongoDB client initialization note:", err.message);
      }
    }
    clientPromise = global._mongoClientPromise;
  } else {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      clientPromise = client.connect();
    } catch (err) {
      console.warn("MongoDB connection note:", err.message);
    }
  }

  try {
    if (clientPromise) {
      const connectedClient = await clientPromise;
      return connectedClient.db(dbName);
    }
  } catch (err) {
    // Graceful fallback to memory store
    return null;
  }
  return null;
}

// -------------------------------------------------------------
// Document Vault Operations (MongoDB Collection: `documents_vault`)
// -------------------------------------------------------------
export async function saveDocumentVault(docData) {
  const db = await getMongoDb();
  const record = {
    ...docData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (db) {
    try {
      const col = db.collection("documents_vault");
      await col.updateOne(
        { user_id: docData.user_id },
        { $set: record },
        { upsert: true }
      );
      return record;
    } catch (e) {
      console.warn("MongoDB write error, using fallback cache:", e.message);
    }
  }

  inMemoryStore.documents_vault.set(docData.user_id, record);
  return record;
}

export async function getDocumentVault(userId) {
  const db = await getMongoDb();
  if (db) {
    try {
      const col = db.collection("documents_vault");
      const doc = await col.findOne({ user_id: userId });
      if (doc) return doc;
    } catch (e) {
      console.warn("MongoDB read error, using fallback cache:", e.message);
    }
  }

  return inMemoryStore.documents_vault.get(userId) || null;
}

// --------------------------------------------------------------------
// Biometric Face Logs Operations (MongoDB Collection: `biometric_face_logs`)
// --------------------------------------------------------------------
export async function saveBiometricLog(bioData) {
  const db = await getMongoDb();
  const record = {
    ...bioData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (db) {
    try {
      const col = db.collection("biometric_face_logs");
      await col.updateOne(
        { user_id: bioData.user_id },
        { $set: record },
        { upsert: true }
      );
      return record;
    } catch (e) {
      console.warn("MongoDB biometric write error:", e.message);
    }
  }

  inMemoryStore.biometric_face_logs.set(bioData.user_id, record);
  return record;
}

export async function getBiometricLog(userId) {
  const db = await getMongoDb();
  if (db) {
    try {
      const col = db.collection("biometric_face_logs");
      const bio = await col.findOne({ user_id: userId });
      if (bio) return bio;
    } catch (e) {
      console.warn("MongoDB biometric read error:", e.message);
    }
  }

  return inMemoryStore.biometric_face_logs.get(userId) || null;
}

// ----------------------------------------------------------------------
// Authority Audit Logs Operations (MongoDB Collection: `authority_audit_logs`)
// ----------------------------------------------------------------------
export async function logAuthorityAction(auditData) {
  const db = await getMongoDb();
  const record = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    ...auditData,
    timestamp: new Date().toISOString(),
  };

  if (db) {
    try {
      const col = db.collection("authority_audit_logs");
      await col.insertOne(record);
      return record;
    } catch (e) {
      console.warn("MongoDB audit log error:", e.message);
    }
  }

  inMemoryStore.authority_audit_logs.unshift(record);
  return record;
}

export async function getAuthorityAuditLogs(limit = 20) {
  const db = await getMongoDb();
  if (db) {
    try {
      const col = db.collection("authority_audit_logs");
      return await col.find().sort({ timestamp: -1 }).limit(limit).toArray();
    } catch (e) {
      console.warn("MongoDB audit fetch error:", e.message);
    }
  }

  return inMemoryStore.authority_audit_logs.slice(0, limit);
}
