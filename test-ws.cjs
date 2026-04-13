const WebSocket = require('ws'); 
const ws = new WebSocket('ws://localhost:5000/api/portfolio'); 

ws.on('open', () => {
  console.log('Connected to WS');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString().slice(0, 100) + '...');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout waiting for message');
  process.exit(1);
}, 5000);
