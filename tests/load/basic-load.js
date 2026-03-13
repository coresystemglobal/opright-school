const autocannon = require('autocannon');

const TOKEN = process.env.TEST_TOKEN || 'your-test-jwt-token';
const URL = process.env.API_URL || 'http://localhost:3000';

const tests = [
  {
    name: 'GET /students',
    url: `${URL}/students`,
    connections: 10,
    duration: 30
  },
  {
    name: 'GET /library/books',
    url: `${URL}/library/books`,
    connections: 10,
    duration: 30
  },
  {
    name: 'GET /events/upcoming',
    url: `${URL}/events/upcoming`,
    connections: 10,
    duration: 30
  }
];

async function runTest(test) {
  console.log(`\n🚀 Running: ${test.name}`);
  console.log(`   URL: ${test.url}`);
  console.log(`   Connections: ${test.connections}, Duration: ${test.duration}s\n`);

  const result = await autocannon({
    url: test.url,
    connections: test.connections,
    duration: test.duration,
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });

  console.log(`\n📊 Results for ${test.name}:`);
  console.log(`   Requests: ${result.requests.total}`);
  console.log(`   Throughput: ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`   Latency: ${result.latency.mean.toFixed(2)}ms (avg)`);
  console.log(`   Errors: ${result.errors}`);
  console.log(`   Timeouts: ${result.timeouts}`);
  console.log(`   RPS: ${result.requests.mean.toFixed(2)}`);
}

async function checkServer() {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(URL, (res) => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔥 Starting Load Tests\n');
  console.log(`Target: ${URL}`);
  console.log(`Token: ${TOKEN.substring(0, 20)}...\n`);
  
  console.log('Checking server...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Server not running at', URL);
    console.error('\nStart the server first:');
    console.error('  npm run dev\n');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  for (const test of tests) {
    await runTest(test);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ All tests completed!');
}

main().catch(console.error);
