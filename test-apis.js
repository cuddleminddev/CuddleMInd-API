const http = require('http');

const baseUrl = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${baseUrl}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testApis() {
  console.log('🧪 Testing Cuddle Mind APIs...\n');
  
  // Test 1: Daily Affirmation
  try {
    console.log('📝 Testing GET /affirmations/daily...');
    const affirmationResponse = await makeRequest('/affirmations/daily');
    console.log(`Status: ${affirmationResponse.status}`);
    if (affirmationResponse.status === 200) {
      console.log('✅ Affirmation API works!');
      console.log(`Quote: "${affirmationResponse.data.data.quote}"`);
      console.log(`Author: ${affirmationResponse.data.data.author}\n`);
    } else {
      console.log('❌ Affirmation API failed');
      console.log('Response:', affirmationResponse.data, '\n');
    }
  } catch (error) {
    console.log('❌ Affirmation API error:', error.message, '\n');
  }
  
  // Test 2: Mood Support - Happy
  try {
    console.log('😊 Testing GET /mood-support/message?mood=happy...');
    const happyResponse = await makeRequest('/mood-support/message?mood=happy');
    console.log(`Status: ${happyResponse.status}`);
    if (happyResponse.status === 200) {
      console.log('✅ Happy mood support API works!');
      console.log(`Message: "${happyResponse.data.data.message}"\n`);
    } else {
      console.log('❌ Happy mood support API failed');
      console.log('Response:', happyResponse.data, '\n');
    }
  } catch (error) {
    console.log('❌ Happy mood support API error:', error.message, '\n');
  }
  
  // Test 3: Mood Support - Sad
  try {
    console.log('😢 Testing GET /mood-support/message?mood=sad...');
    const sadResponse = await makeRequest('/mood-support/message?mood=sad');
    console.log(`Status: ${sadResponse.status}`);
    if (sadResponse.status === 200) {
      console.log('✅ Sad mood support API works!');
      console.log(`Message: "${sadResponse.data.data.message}"\n`);
    } else {
      console.log('❌ Sad mood support API failed');
      console.log('Response:', sadResponse.data, '\n');
    }
  } catch (error) {
    console.log('❌ Sad mood support API error:', error.message, '\n');
  }
  
  // Test 4: Invalid Mood
  try {
    console.log('❓ Testing GET /mood-support/message?mood=invalid...');
    const invalidResponse = await makeRequest('/mood-support/message?mood=invalid');
    console.log(`Status: ${invalidResponse.status}`);
    if (invalidResponse.status === 400) {
      console.log('✅ Invalid mood validation works!');
      console.log(`Error: "${invalidResponse.data.message}"\n`);
    } else {
      console.log('❌ Invalid mood validation failed');
      console.log('Response:', invalidResponse.data, '\n');
    }
  } catch (error) {
    console.log('❌ Invalid mood validation error:', error.message, '\n');
  }
  
  // Test 5: Available Moods
  try {
    console.log('📋 Testing GET /mood-support/moods...');
    const moodsResponse = await makeRequest('/mood-support/moods');
    console.log(`Status: ${moodsResponse.status}`);
    if (moodsResponse.status === 200) {
      console.log('✅ Available moods API works!');
      console.log('Available moods:', moodsResponse.data.data.map(m => `${m.emoji} ${m.label}`).join(', '), '\n');
    } else {
      console.log('❌ Available moods API failed');
      console.log('Response:', moodsResponse.data, '\n');
    }
  } catch (error) {
    console.log('❌ Available moods API error:', error.message, '\n');
  }
  
  console.log('🎉 API testing completed!');
}

// Check if server is running first
console.log('🔍 Checking if server is running on localhost:3000...');
console.log('📝 NOTE: Affirmations are now stored in the database!');
console.log('   Make sure to run: npm run prisma:seed (to populate affirmations)');
makeRequest('/health')
  .then(() => {
    testApis();
  })
  .catch(() => {
    console.log('⚠️  Server not running. Please start the server with: npm run start:dev');
    console.log('📋 Make sure you have:');
    console.log('   1. Database running');
    console.log('   2. Prisma migrations applied: npm run prisma:migrate');
    console.log('   3. Database seeded: npm run prisma:seed');
    console.log('Then run this test script again with: node test-apis.js');
  });
