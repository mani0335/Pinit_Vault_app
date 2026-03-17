#!/usr/bin/env node
/**
 * Verification Script: Check if biometric data is stored in MongoDB
 * Usage: node verify-biometric-storage.js <userId>
 */

const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://manish:Manish%401614@cluster0.jwchpax.mongodb.net/biovault?appName=Cluster0';
const dbName = process.env.MONGODB_DB || 'biovault';
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node verify-biometric-storage.js <userId>');
  process.exit(1);
}

async function verifyBiometricStorage() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find the user
    const user = await usersCollection.findOne({ userId });

    if (!user) {
      console.error(`✗ User '${userId}' not found in database`);
      return;
    }

    console.log('\n📋 User Biometric Storage Status:');
    console.log('═══════════════════════════════════════');
    console.log(`User ID: ${user.userId}`);
    console.log(`Device Token: ${user.deviceToken ? '✓ Stored' : '✗ Missing'}`);
    console.log(`Device ID: ${user.deviceId ? '✓ Stored' : '✗ Missing'}`);

    console.log('\n🔐 Biometric Data:');
    console.log('───────────────────────────────────────');
    console.log(`Biometric Enabled: ${user.biometricEnabled ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Fingerprint Registered: ${user.fingerprintRegistered ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Face Registered: ${user.faceRegistered ? 'YES ✓' : 'NO ✗'}`);

    if (user.webauthn_credential) {
      console.log(`\n👆 Fingerprint WebAuthn:`)
      console.log(`  ID: ${user.webauthn_credential.id ? '✓' : '✗'}`);
      console.log(`  Type: ${user.webauthn_credential.type || 'N/A'}`);
    } else {
      console.log(`\n👆 Fingerprint WebAuthn: ✗ NOT STORED`);
    }

    if (user.face_embedding && Array.isArray(user.face_embedding) && user.face_embedding.length > 0) {
      console.log(`\n👤 Face Embedding:`)
      console.log(`  Vector Length: ${user.face_embedding.length}`);
      console.log(`  Quality Score: ${user.faceQualityScore || 'N/A'}`);
      console.log(`  Sample Values: [${user.face_embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}, ...]`);
    } else {
      console.log(`\n👤 Face Embedding: ✗ NOT STORED`);
    }

    console.log('\n⏱️  Timestamps:');
    console.log('───────────────────────────────────────');
    console.log(`Created: ${user.createdAt ? new Date(user.createdAt).toISOString() : 'N/A'}`);
    console.log(`Last Update: ${user.updatedAt ? new Date(user.updatedAt).toISOString() : 'N/A'}`);
    console.log(`Last Biometric Update: ${user.lastBiometricUpdate ? new Date(user.lastBiometricUpdate).toISOString() : 'N/A'}`);

    // Summary
    console.log('\n✅ Summary:');
    console.log('═══════════════════════════════════════');
    const fingerprintOk = user.fingerprintRegistered && user.webauthn_credential;
    const faceOk = user.faceRegistered && user.face_embedding && user.face_embedding.length > 0;
    const allOk = fingerprintOk && faceOk;

    console.log(`Fingerprint Status: ${fingerprintOk ? '✅ PROPERLY STORED' : '❌ NOT STORED'}`);
    console.log(`Face Status: ${faceOk ? '✅ PROPERLY STORED' : '❌ NOT STORED'}`);
    console.log(`Overall: ${allOk ? '✅ ALL BIOMETRIC DATA STORED' : '⚠️  INCOMPLETE'}`);

  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await client.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

verifyBiometricStorage();
