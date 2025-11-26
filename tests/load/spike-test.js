const autocannon = require('autocannon');

const TOKEN = process.env.TEST_TOKEN || 'your-test-jwt-token';
const URL = process.env.API_URL || 'http://localhost:3000';

async function spikeTest() {
  console.log('⚡ SPIKE TEST - Sudden Traffic Surge\n');
  
  console.log('Phase 1: Normal load (10 connections, 10s)');
  await autocannon({
    url: `${URL}/students`,
    connections: 10,
    duration: 10,
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });

  console.log('\n⚡ SPIKE! (500 connections, 10s)');
  const spike = await autocannon({
    url: `${URL}/students`,
    connections: 500,
    duration: 10,
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });

  console.log(`\n📊 Spike Results:`);
  console.log(`   RPS: ${spike.requests.mean.toFixed(2)}`);
  console.log(`   Latency: ${spike.latency.mean.toFixed(2)}ms (avg), ${spike.latency.p99.toFixed(2)}ms (p99)`);
  console.log(`   Errors: ${spike.errors}`);
  console.log(`   Success Rate: ${((1 - spike.errors / spike.requests.total) * 100).toFixed(2)}%`);

  console.log('\nPhase 3: Recovery (10 connections, 10s)');
  await autocannon({
    url: `${URL}/students`,
    connections: 10,
    duration: 10,
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  
  console.log('\n✅ Spike test completed!');
}

spikeTest().catch(console.error);
