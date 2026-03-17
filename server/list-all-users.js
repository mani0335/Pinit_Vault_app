#!/usr/bin/env node
/**
 * List all users in MongoDB
 */

const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://manish:Manish%401614@cluster0.jwchpax.mongodb.net/biovault?appName=Cluster0';
const dbName = process.env.MONGODB_DB || 'biovault';

async function listAllUsers() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Get all users
    const users = await usersCollection.find({}).toArray();

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`📊 Total Users: ${users.length}\n`);
    console.log('═══════════════════════════════════════════════════════════');

    users.forEach((user, index) => {
      console.log(`\n[${index + 1}] User ID: ${user.userId}`);
      console.log('   ├─ Device Token: ' + (user.deviceToken ? '✓' : '✗'));
      console.log('   ├─ Device ID: ' + (user.deviceId ? `✓ (${user.deviceId})` : '✗'));
      console.log('   ├─ Biometric Enabled: ' + (user.biometricEnabled ? 'YES' : 'NO'));
      console.log('   ├─ Fingerprint: ' + (user.webauthn_credential ? '✓' : '✗'));
      console.log('   ├─ Face Embedding: ' + (user.face_embedding && user.face_embedding.length > 0 ? `✓ (${user.face_embedding.length} dimensions)` : '✗'));
      console.log('   └─ Created: ' + (user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'));
    });

    console.log('\n═══════════════════════════════════════════════════════════');

  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await client.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

listAllUsers();
