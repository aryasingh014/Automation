
// use native fetch

async function test() {
  const payload = {
    name: 'Rohan',
    email: '22it014@excelcolleges.com',
    password: 'Arya@123'
  };

  try {
    const res = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const data = await res.json();

    console.log('STATUS:', status);
    console.log('DATA:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
