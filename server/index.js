const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { join } = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory DB (for demo). In production use Firestore via Firebase Admin.
const users = new Map();

// Initialize Firebase Admin if service account provided
let firestore = null;
try {
  const admin = require('firebase-admin');
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const svcPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let cred;
  if (svcJson) {
    cred = JSON.parse(svcJson);
  } else if (svcPath) {
    cred = require(svcPath);
  }

  if (cred) {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    }
    firestore = admin.firestore();
    console.log('Firebase Admin initialized, Firestore enabled');
  }
} catch (e) {
  // ignore — Firestore remains null and in-memory Map is used
  console.warn('Firebase Admin not initialized:', e && e.message ? e.message : e);
}

// POST /api/register
// body: { userId, deviceToken }
app.post('/api/register', (req, res) => {
  const { userId, deviceToken, webauthn, faceEmbedding } = req.body || {};
  if (!userId || !deviceToken) return res.status(400).json({ error: 'Missing userId or deviceToken' });

  // If Firestore is enabled, persist to Firestore
  if (firestore) {
    (async () => {
      try {
        await firestore.collection('users').doc(userId).set({
          deviceToken,
          biometricEnabled: !!(webauthn || faceEmbedding),
          webauthn_credential: webauthn || null,
          face_embedding: faceEmbedding || null,
          created_at: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log('Registered user (firestore)', userId);
        return res.json({ ok: true });
      } catch (err) {
        console.error('Firestore register error', err);
        return res.status(500).json({ error: 'Failed to register' });
      }
    })();
    return;
  }

  // Fallback to in-memory Map for demo
  users.set(userId, { deviceToken, biometricEnabled: !!(webauthn || faceEmbedding), webauthn_credential: webauthn || null, face_embedding: faceEmbedding || null });
  console.log('Registered user', userId, 'device', deviceToken);
  return res.json({ ok: true });
});

// POST /api/validate
// body: { userId, deviceToken }
app.post('/api/validate', (req, res) => {
  const { userId, deviceToken } = req.body || {};
  if (!userId || !deviceToken) return res.status(400).json({ error: 'Missing userId or deviceToken' });

  if (firestore) {
    (async () => {
      try {
        const doc = await firestore.collection('users').doc(userId).get();
        if (!doc.exists) return res.status(403).json({ authorized: false, reason: 'User not registered' });
        const data = doc.data();
        if (!data.biometricEnabled) return res.status(403).json({ authorized: false, reason: 'Biometric not enabled' });
        if (data.deviceToken !== deviceToken) return res.status(403).json({ authorized: false, reason: 'Device mismatch' });
        return res.json({ authorized: true });
      } catch (err) {
        console.error('Firestore validate error', err);
        return res.status(500).json({ authorized: false, reason: 'Validation failure' });
      }
    })();
    return;
  }

  const record = users.get(userId);
  if (!record) return res.status(403).json({ authorized: false, reason: 'User not registered' });
  if (!record.biometricEnabled) return res.status(403).json({ authorized: false, reason: 'Biometric not enabled' });
  if (record.deviceToken !== deviceToken) return res.status(403).json({ authorized: false, reason: 'Device mismatch' });

  return res.json({ authorized: true });
});

// POST /api/face - store face embedding separately
app.post('/api/face', (req, res) => {
  const { userId, embedding } = req.body || {};
  if (!userId || !embedding) return res.status(400).json({ error: 'Missing userId or embedding' });

  if (firestore) {
    (async () => {
      try {
        await firestore.collection('users').doc(userId).set({ face_embedding: embedding }, { merge: true });
        return res.json({ ok: true });
      } catch (err) {
        console.error('Firestore face save error', err);
        return res.status(500).json({ error: 'Failed to save embedding' });
      }
    })();
    return;
  }

  const rec = users.get(userId) || {};
  rec.face_embedding = embedding;
  users.set(userId, rec);
  return res.json({ ok: true });
});

app.get('/', (req, res) => res.send('Biovault mock server running'));

const port = process.env.PORT || 3333;
// Bind to all interfaces so the server is reachable from devices on the LAN
app.listen(port, '0.0.0.0', () => console.log(`Biovault mock server running on port ${port}`));
