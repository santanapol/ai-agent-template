const axios = require('axios');
async function run() {
  try {
    const res = await axios.patch('http://127.0.0.1:3000/api/v1/agents/6a2110c29369899c6c6e9e43/fees/6a2125c92d4ddea761e93aa8', 
      { fee_rate: 20 },
      { headers: { 'If-Match': 'W/"something"', 'x-gateway-secret': 'WSgEKTV8ci7UguW6qRDPsMJNBnI4l7lU', 'x-user-ou': 'TEST', 'x-user-branch': 'TEST' } }
    );
    console.log(res.data);
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
}
run();
