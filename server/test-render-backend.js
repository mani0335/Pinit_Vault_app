#!/usr/bin/env node
/**
 * Test if Render backend is working and connected to MongoDB
 */

const API_BASE = "https://biovault-app.onrender.com";

async function testBackend() {
  try {
    console.log("🔍 Testing Render Backend...\n");
    
    // Test 1: Check if backend is alive
    console.log("1️⃣  Checking backend connectivity...");
    const apiRes = await fetch(`${API_BASE}/api/user/test-user/biometric-status?deviceToken=test123`);
    console.log(`   Status: ${apiRes.status} ${apiRes.statusText}`);
    if (apiRes.status === 404) console.log("   ✓ Backend is responding (user not found is OK)\n");
    else console.log("   ⚠️  Unexpected response\n");

    // Test 2: Try to register a test user
    console.log("2️⃣  Testing registration endpoint...");
    const registerRes = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test.user.render",
        deviceToken: "TEST-TOKEN-12345",
        webauthn: null,
        faceEmbedding: [0.1, 0.2, 0.3]
      })
    });
    const registerData = await registerRes.json();
    console.log(`   Status: ${registerRes.status}`);
    console.log(`   Response: `, registerData);
    
    if (registerRes.ok) {
      console.log("   ✓ Registration endpoint working!\n");
    } else {
      console.log("   ❌ Registration failed - Backend might not be connected to MongoDB\n");
    }

    // Test 3: Query what we just sent
    console.log("3️⃣  Checking if data was saved...");
    await new Promise(r => setTimeout(r, 1000)); // wait 1 second
    
    const statusRes = await fetch(`${API_BASE}/api/user/test.user.render/biometric-status?deviceToken=TEST-TOKEN-12345`);
    const statusData = await statusRes.json();
    console.log(`   Status: ${statusRes.status}`);
    console.log(`   Response:`, statusData);
    
    if (statusRes.ok) {
      console.log("   ✓ Data was saved to Render backend!\n");
    } else {
      console.log("   ❌ Data was NOT saved - Render backend might not have MongoDB credentials\n");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testBackend();
