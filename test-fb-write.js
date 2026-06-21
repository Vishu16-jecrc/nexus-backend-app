const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.cert(serviceAccount)
});
const db = getFirestore();

async function run() {
  try {
    console.log('Writing test document...');
    await db.collection('users').doc('test-user').set({ username: 'test-user', timestamp: new Date().toISOString() });
    console.log('Write succeeded!');
    
    console.log('Reading test document...');
    const doc = await db.collection('users').doc('test-user').get();
    console.log('Read data:', doc.data());
  } catch (e) {
    console.error('Error during write/read:', e);
  }
}

run();
