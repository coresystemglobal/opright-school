const autocannon = require('autocannon');

const TOKEN = process.env.TEST_TOKEN || 'your-test-jwt-token';
const URL = process.env.API_URL || 'http://localhost:3000';

async function stressTest() {
  console.log('💥 STRESS TEST - Increasing Load\n');
  
  const stages = [
    { connections: 10, duration: 10, name: 'Warm-up' },
    { connections: 50, duration: 20, name: 'Medium Load' },
    { connections: 100, duration: 20, name: 'High Load' },
    { connections: 200, duration: 20, name: 'Peak Load' }
  ];

  for (const stage of stages) {
    console.log(`\n🔥 ${stage.name}: ${stage.connections} connections for ${stage.duration}s`);
    
    const result = await autocannon({
      url: `${URL}/library/books`,
      connections: stage.connections,
      duration: stage.duration,
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    console.log(`   RPS: ${result.requests.mean.toFixed(2)}`);
    console.log(`   Latency: ${result.latency.mean.toFixed(2)}ms (avg), ${result.latency.p99.toFixed(2)}ms (p99)`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.errors > result.requests.total * 0.05) {
      console.log('   ⚠️  Error rate > 5%, stopping test');
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✅ Stress test completed!');
}

stressTest().catch(console.error);
