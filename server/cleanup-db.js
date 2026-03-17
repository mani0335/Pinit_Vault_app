#!/usr/bin/env node
/**
 * Clean up old test data from MongoDB
 */

const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://manish:Manish%401614@cluster0.jwchpax.mongodb.net/biovault?appName=Cluster0';
const dbName = process.env.MONGODB_DB || 'biovault';

async function cleanupOldData() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find records without userId (old test data)
    const invalidUsers = await usersCollection.find({ userId: { $in: [null, undefined, ''] } }).toArray();
    
    console.log(`📊 Found ${invalidUsers.length} records with invalid/missing userId\n`);
    
    if (invalidUsers.length > 0) {
      console.log('Deleting old test records...');
      const result = await usersCollection.deleteMany({ userId: { $in: [null, undefined, ''] } });
      console.log(`✓ Deleted ${result.deletedCount} old test records\n`);
    }

    // Show remaining valid records
    const validUsers = await usersCollection.find({ userId: { $nin: [null, undefined, ''] } }).toArray();
    
    console.log(`✅ Database cleaned! ${validUsers.length} valid users remain:\n`);
    
    if (validUsers.length === 0) {
      console.log('Database is now empty and ready for real registrations.\n');
    } else {
      validUsers.forEach((user, index) => {
        console.log(`[${index + 1}] ${user.userId}`);
        console.log(`    Device: ${user.deviceToken ? '✓' : '✗'}`);
        console.log(`    Biometric: ${user.biometricEnabled ? 'YES' : 'NO'}\n`);
      });
    }

  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await client.close();
    console.log('✓ Disconnected from MongoDB');
  }
}

cleanupOldData();
