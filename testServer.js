// testServer.js - Run this to test if your server is receiving requests

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function testEndpoint(endpoint, method = 'GET') {
    console.log(`\n🧪 Testing: ${method} ${endpoint}`);
    console.log('─'.repeat(50));
    
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log(`✅ Status: ${response.status}`);
        console.log(`📦 Response:`, JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STARTING SERVER TESTS');
    console.log('='.repeat(60));
    console.log(`📍 Testing server at: ${BASE_URL}`);
    console.log('⚠️  Make sure your server is running!\n');
    
    // Wait a bit to let you read the message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test endpoints
    await testEndpoint('/');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testEndpoint('/api/health');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testEndpoint('/api/nonexistent');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTS COMPLETE');
    console.log('='.repeat(60));
    console.log('\n👀 CHECK YOUR SERVER TERMINAL - You should see logs for these requests!\n');
}

runTests();