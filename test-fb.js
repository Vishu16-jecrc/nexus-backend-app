const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

try {
  admin.initializeApp({
    credential: admin.cert(serviceAccount)
  });
  const db = getFirestore();
  console.log('Successfully initialized Firestore using getFirestore()!');
} catch (e) {
  console.error('Failed:', e);
}
