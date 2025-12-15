/**
 * Local Test Script for Lambda CORS
 *
 * Tests the Lambda handler locally with different event configurations
 * to verify CORS origin extraction works correctly
 */

import { handler } from './app.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testEvent(eventFile, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${description}`);
  console.log(`${'='.repeat(60)}`);

  const event = JSON.parse(readFileSync(join(__dirname, eventFile), 'utf-8'));

  console.log('\n📥 Event:');
  console.log(JSON.stringify(event, null, 2));

  try {
    const response = await handler(event, {});

    console.log('\n📤 Response:');
    console.log(`Status Code: ${response.statusCode}`);
    console.log('\nHeaders:');
    console.log(JSON.stringify(response.headers, null, 2));

    if (response.body) {
      console.log('\nBody:');
      try {
        const parsed = JSON.parse(response.body);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(response.body);
      }
    }

    // Verify CORS headers
    console.log('\n✅ CORS Headers Check:');
    const origin = event.headers?.Origin || event.headers?.origin || event.headers?.ORIGIN;
    const corsOrigin = response.headers?.['Access-Control-Allow-Origin'];

    if (origin && corsOrigin) {
      if (corsOrigin === origin || corsOrigin === '*') {
        console.log(`✅ Access-Control-Allow-Origin: ${corsOrigin}`);
        if (corsOrigin === origin) {
          console.log('   ✅ Origin matches request origin (FIX VERIFIED)');
        } else {
          console.log('   ⚠️  Origin is wildcard (may be expected)');
        }
      } else {
        console.log(`❌ Access-Control-Allow-Origin mismatch:`);
        console.log(`   Expected: ${origin} or *`);
        console.log(`   Got: ${corsOrigin}`);
      }
    } else {
      console.log('⚠️  No Origin header in request or response');
    }

    if (response.headers?.['Access-Control-Allow-Credentials']) {
      console.log(
        `✅ Access-Control-Allow-Credentials: ${response.headers['Access-Control-Allow-Credentials']}`,
      );
    }

    if (response.headers?.['Access-Control-Allow-Methods']) {
      console.log(
        `✅ Access-Control-Allow-Methods: ${response.headers['Access-Control-Allow-Methods']}`,
      );
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

async function runTests() {
  console.log('\n🧪 Lambda CORS End-to-End Test');
  console.log('Testing CORS origin extraction fix (case-insensitive headers)\n');

  // Test 1: Normal POST request with Origin header
  await testEvent('test-event.json', 'POST Request with Origin header');

  // Test 2: OPTIONS preflight request
  await testEvent('test-event-options.json', 'OPTIONS Preflight Request');

  // Test 3: POST request with uppercase ORIGIN header (case-insensitive test)
  await testEvent(
    'test-event-case-insensitive.json',
    'POST Request with ORIGIN header (uppercase)',
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed');
  console.log('='.repeat(60) + '\n');
}

runTests().catch(console.error);
