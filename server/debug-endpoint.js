#!/usr/bin/env node
/**
 * Direct test of backend endpoints
 */

const API_BASE = "https://biovault-app.onrender.com";
const TEST_USER = "test.user.render";
const TEST_TOKEN = "TEST-TOKEN-12345";

async function test() {
  try {
    console.log("Testing endpoint directly...\n");
    
    // Try the biometric-status endpoint
    const url = `${API_BASE}/api/user/${TEST_USER}/biometric-status?deviceToken=${TEST_TOKEN}`;
    console.log(`URL: ${url}\n`);
    
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    
    const text = await res.text();
    console.log(`Response (first 500 chars):\n${text.substring(0, 500)}`);
    
    if (res.status === 404) {
      console.log("\n✓ 404 is expected (user not registered yet)");
    }
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
