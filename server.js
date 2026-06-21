require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
const PORT = process.env.PORT || 5000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY_HERE';

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));


const DB_FILE = path.join(__dirname, 'database.json');
const FIREBASE_KEY_FILE = path.join(__dirname, 'firebase-service-account.json');

let db = null;
let useFirebase = false;

// Initialize database file if it doesn't exist (fallback)
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// ------------------------------------------
// FIREBASE FIRESTORE INITIALIZATION
// ------------------------------------------
if (fs.existsSync(FIREBASE_KEY_FILE)) {
  try {
    const serviceAccount = require(FIREBASE_KEY_FILE);
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    db = getFirestore();
    useFirebase = true;
    console.log('\x1b[32m[FIREBASE] Credentials file loaded successfully. Connected to Firestore!\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m[FIREBASE] Initialization error. Falling back to local database.json:\x1b[0m', err);
  }
} else {
  console.log('\n\x1b[33m====================================================\x1b[0m');
  console.log('\x1b[33m[FIREBASE ALERT] "firebase-service-account.json" not found.\x1b[0m');
  console.log('\x1b[33mSYSTEM CLOUD FALLBACK ACTIVATED: USING LOCAL FILE DATABASE\x1b[0m');
  console.log('\x1b[33m====================================================\x1b[0m\n');
}

// Helper to read database (checks fallback or Firebase)
async function fetchAllUsers() {
  if (useFirebase) {
    try {
      const snapshot = await db.collection('users').get();
      return snapshot.docs.map(doc => doc.data());
    } catch (err) {
      console.error('[FIREBASE ERROR] Failed to fetch users from Firestore:', err);
      return [];
    }
  } else {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      return [];
    }
  }
}

// Helper to add user (checks fallback or Firebase)
async function saveUser(newUser) {
  if (useFirebase) {
    try {
      // Save in Firestore collection 'users' with username (lowercase) as document ID
      await db.collection('users').doc(newUser.username.toLowerCase()).set(newUser);
      console.log(`[FIREBASE] Saved user "${newUser.username}" to Firestore.`);
    } catch (err) {
      console.error('[FIREBASE ERROR] Failed to write user to Firestore:', err);
      throw err;
    }
  } else {
    const users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '[]');
    users.push(newUser);
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
  }
}

// Helper to look up a single user
async function findUserByUsername(username) {
  if (useFirebase) {
    try {
      const doc = await db.collection('users').doc(username.toLowerCase()).get();
      return doc.exists ? doc.data() : null;
    } catch (err) {
      console.error('[FIREBASE ERROR] Single lookup failed:', err);
      return null;
    }
  } else {
    const users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '[]');
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }
}

// ==========================================
// SMTP/EMAIL CONFIGURATION BLOCK
// ==========================================
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  service: 'gmail',
  auth: {
    user: 'v.nahar2004@gmail.com',
    pass: 'yesh qtyl fnpq yyaj'
  }
};

async function sendOTPEmail(targetEmail, otp) {
  let transporter;
  let isEthereal = false;

  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.log('\x1b[33m[NEXUS EMAIL] No SMTP settings found. Generating Ethereal Test Account...\x1b[0m');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    isEthereal = true;
  } else {
    const transportOpts = {
      auth: SMTP_CONFIG.auth,
      connectionTimeout: 4000, // 4 seconds timeout
      greetingTimeout: 4000
    };
    if (SMTP_CONFIG.service) {
      transportOpts.service = SMTP_CONFIG.service;
    } else {
      transportOpts.host = SMTP_CONFIG.host;
      transportOpts.port = SMTP_CONFIG.port;
      transportOpts.secure = SMTP_CONFIG.port === 465;
    }
    transporter = nodemailer.createTransport(transportOpts);
  }

  const htmlContent = `
    <div style="background-color: #05060b; color: #f8fafc; font-family: 'Outfit', sans-serif; padding: 40px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(168, 85, 247, 0.2);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00f0ff; letter-spacing: 2px; font-family: 'Space Grotesk', sans-serif; text-transform: uppercase;">NEXUS // SECURITY GATEWAY</h1>
        <p style="color: #94a3b8; font-size: 0.9rem;">Identity Verification Protocol</p>
      </div>
      <div style="background: rgba(10, 11, 22, 0.6); padding: 30px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
        <p style="font-size: 1.05rem; margin-bottom: 24px; color: #94a3b8;">You are receiving this email to verify registration on the NEXUS Core system. Use the OTP token below to authenticate:</p>
        <div style="background: rgba(168, 85, 247, 0.1); border: 1px dashed #a855f7; border-radius: 8px; padding: 15px; display: inline-block; font-size: 2.2rem; font-weight: 700; color: #00f0ff; letter-spacing: 6px; font-family: 'Space Grotesk', sans-serif; margin-bottom: 24px;">
          ${otp}
        </div>
        <p style="color: #ef4444; font-size: 0.8rem; margin: 0;">This OTP access token is valid for 5 minutes only. Do not share this code.</p>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 0.75rem;">
        <p>SYSTEM ACCESS LEVEL: ML_DSA_DEVELOPER</p>
        <p>&copy; ${new Date().getFullYear()} NEXUS CORE INC. ALL PROTOCOLS SECURED.</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: SMTP_CONFIG.auth.user ? `"NEXUS SECURITY" <${SMTP_CONFIG.auth.user}>` : '"NEXUS SECURITY" <no-reply@nexus-core.com>',
    to: targetEmail,
    subject: 'NEXUS SECURITY PROTOCOL: OTP ACCESS TOKEN',
    html: htmlContent
  });

  if (isEthereal) {
    const testUrl = nodemailer.getTestMessageUrl(info);
    console.log('\n\x1b[36m====================================================\x1b[0m');
    console.log('\x1b[35m[ETHEREAL MAIL INBOX] OUTGOING OTP TEST EMAIL\x1b[0m');
    console.log('\x1b[36m====================================================\x1b[0m');
    console.log(`\x1b[32mTARGET EMAIL:\x1b[0m ${targetEmail}`);
    console.log(`\x1b[33mINBOX URL:\x1b[0m    \x1b[4m${testUrl}\x1b[0m`);
    console.log('\x1b[36m====================================================\x1b[0m\n');
    return { testUrl };
  } else {
    console.log(`\x1b[32m[EMAIL] OTP sent to ${targetEmail} via configured SMTP server.\x1b[0m`);
    return { success: true };
  }
}

// Temporary store for pending registrations
const pendingRegistrations = new Map();

// 1. Endpoint: Initiate Registration
app.post('/api/auth/register-initiate', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password, and email are required.' });
  }

  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already registered.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in memory with 5-minute expiry
  pendingRegistrations.set(username.toLowerCase(), {
    username,
    password,
    email,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  try {
    const emailResult = await sendOTPEmail(email, otp);

    console.log('\n\x1b[36m====================================================\x1b[0m');
    console.log('\x1b[35m[NEXUS GATEWAY SECURITY] USER REGISTRATION INITIATED\x1b[0m');
    console.log('\x1b[36m====================================================\x1b[0m');
    console.log(`\x1b[32mUSER ID:\x1b[0m    ${username}`);
    console.log(`\x1b[32mEMAIL:\x1b[0m      ${email}`);
    console.log(`\x1b[31mOTP CODE:\x1b[0m   >>>  \x1b[1m\x1b[4m${otp}\x1b[0m\x1b[31m  <<<\x1b[0m`);
    console.log('\x1b[36m====================================================\x1b[0m\n');

    res.json({
      message: 'OTP verification email sent.',
      testUrl: emailResult.testUrl || null,
      otp: otp // Include for developer bypass
    });
  } catch (err) {
    console.error('\x1b[31m[ERROR] Failed to send email:\x1b[0m', err.message);
    // Fallback: Still allow registration, return OTP in response for developer bypass!
    res.json({
      message: 'OTP generated. (SMTP blocked on hosting, using Developer Bypass code)',
      otp: otp
    });
  }
});

// 2. Endpoint: Verify OTP and Save User to Firestore/Fallback
app.post('/api/auth/register-verify', async (req, res) => {
  const { username, otp } = req.body;

  if (!username || !otp) {
    return res.status(400).json({ error: 'Username and OTP are required.' });
  }

  const pending = pendingRegistrations.get(username.toLowerCase());

  if (!pending) {
    return res.status(400).json({ error: 'No registration session found for this username.' });
  }

  if (Date.now() > pending.expiresAt) {
    pendingRegistrations.delete(username.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired. Please register again.' });
  }

  if (pending.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP code. Access denied.' });
  }

  // OTP matches! Write user to database
  const newUser = {
    username: pending.username,
    password: pending.password,
    email: pending.email,
    createdAt: new Date().toISOString()
  };

  try {
    await saveUser(newUser);
    pendingRegistrations.delete(username.toLowerCase());
    console.log(`\x1b[32m[SUCCESS] User "${pending.username}" has verified registration.\x1b[0m`);
    res.json({ message: 'Identity verified. You can log in now!' });
  } catch (err) {
    res.status(500).json({ error: 'Database write anomaly.' });
  }
});

// 3. Endpoint: User Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  const matchedUser = await findUserByUsername(username);

  if (matchedUser && matchedUser.password === password) {
    const token = `user-token-${Buffer.from(username).toString('base64')}`;
    res.json({
      username: matchedUser.username,
      token
    });
  } else {
    res.status(401).json({ error: 'Invalid User ID or password.' });
  }
});

// 4. Endpoint: Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin_secure_gate') {
    res.json({
      role: 'admin',
      token: 'admin-gate-secure-token-2026'
    });
  } else {
    res.status(401).json({ error: 'Access Denied. Incorrect admin password.' });
  }
});

// 5. Endpoint: Get database (Admin Only - Pulls from Firestore/Fallback)
app.get('/api/admin/users', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader === 'Bearer admin-gate-secure-token-2026') {
    const users = await fetchAllUsers();
    res.json(users);
  } else {
    res.status(403).json({ error: 'Access Forbidden. Unauthorized access logged.' });
  }
});


// 6. Endpoint: Shazam Song Recognition
app.post('/api/shazam-recognize', async (req, res) => {
  const { audio } = req.body;

  if (!audio) {
    console.log('\x1b[31m[SHAZAM] Request rejected — no audio payload provided.\x1b[0m');
    return res.status(400).json({ error: 'Missing "audio" field. Provide base64-encoded raw PCM audio.' });
  }

  console.log('\n\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[35m[NEXUS SHAZAM] AUDIO RECOGNITION SEQUENCE INITIATED\x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log(`\x1b[33mPAYLOAD SIZE:\x1b[0m  ${(Buffer.byteLength(audio, 'utf8') / 1024).toFixed(1)} KB`);
  console.log('\x1b[33mTARGET API:\x1b[0m    shazam.p.rapidapi.com/songs/detect');
  console.log('\x1b[36m====================================================\x1b[0m');

  try {
    const response = await fetch('https://shazam.p.rapidapi.com/songs/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'shazam.p.rapidapi.com'
      },
      body: audio
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`\x1b[31m[SHAZAM] API responded with HTTP ${response.status}: ${errorText}\x1b[0m`);
      return res.status(response.status).json({
        error: `Shazam API error (HTTP ${response.status})`,
        details: errorText
      });
    }

    const data = await response.json();

    // Check if Shazam found a match
    if (!data.track) {
      console.log('\x1b[33m[SHAZAM] No match found for the provided audio sample.\x1b[0m\n');
      return res.json({ status: 'not_found', track: null });
    }

    const track = data.track;

    // Extract Apple Music metadata if available
    const appleMusicSection = (track.sections || []).find(s => s.type === 'SONG');
    const appleMetadata = appleMusicSection?.metadata || [];
    const albumMeta = appleMetadata.find(m => m.title === 'Album');
    const genreMeta = appleMetadata.find(m => m.title === 'Genre');

    // Extract hub actions for preview URL
    const hubActions = track.hub?.actions || [];
    const previewAction = hubActions.find(a => a.type === 'uri' && a.uri);

    // Build clean response
    const result = {
      status: 'success',
      track: {
        title: track.title || 'Unknown Title',
        artist: track.subtitle || 'Unknown Artist',
        album: albumMeta?.text || null,
        genre: genreMeta?.text || track.genres?.primary || null,
        coverUrl: track.images?.coverart || track.images?.coverarthq || null,
        previewUrl: previewAction?.uri || track.hub?.actions?.[1]?.uri || null,
        shazamUrl: track.url || null,
        appleMusicUrl: track.hub?.options?.[0]?.actions?.[0]?.uri || null
      }
    };

    console.log('\n\x1b[36m----------------------------------------------------\x1b[0m');
    console.log('\x1b[32m[SHAZAM] ✦ TRACK IDENTIFIED SUCCESSFULLY ✦\x1b[0m');
    console.log('\x1b[36m----------------------------------------------------\x1b[0m');
    console.log(`\x1b[32mTITLE:\x1b[0m    ${result.track.title}`);
    console.log(`\x1b[32mARTIST:\x1b[0m   ${result.track.artist}`);
    console.log(`\x1b[32mALBUM:\x1b[0m    ${result.track.album || 'N/A'}`);
    console.log(`\x1b[32mGENRE:\x1b[0m    ${result.track.genre || 'N/A'}`);
    console.log('\x1b[36m----------------------------------------------------\x1b[0m\n');

    return res.json(result);
  } catch (err) {
    console.error('\x1b[31m[SHAZAM] Recognition pipeline failure:\x1b[0m', err.message);
    return res.status(500).json({ error: 'Shazam recognition failed.', details: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`\n\x1b[35m[NEXUS BACKEND] Systems operating on http://localhost:${PORT}\x1b[0m\n`);
});

