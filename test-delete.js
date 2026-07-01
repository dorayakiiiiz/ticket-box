const http = require('http');

async function testDelete() {
  try {
    const req = http.request('http://localhost:3000/admin/users/123-test', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
      });
    });
    
    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
    });
    
    req.end();
  } catch (error) {
    console.error(error);
  }
}

testDelete();
