async function run() {
  const username = 'testuser' + Math.floor(Math.random() * 1000);
  const password = 'testpassword';
  const email = 'test@example.com';

  try {
    console.log(`Initiating registration for "${username}"...`);
    const initiateRes = await fetch('http://localhost:5000/api/auth/register-initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    const initiateData = await initiateRes.json();
    console.log('Initiate response:', initiateData);
    
    if (initiateData.error) {
      console.error('Initiate failed:', initiateData.error);
      return;
    }
    
    const otp = initiateData.otp;
    console.log(`Verifying registration with OTP "${otp}"...`);
    const verifyRes = await fetch('http://localhost:5000/api/auth/register-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otp })
    });
    const verifyData = await verifyRes.json();
    console.log('Verify response:', verifyData);
  } catch (e) {
    console.error('Registration flow failed:', e);
  }
}
run();
