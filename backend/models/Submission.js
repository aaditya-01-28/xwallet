const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  // Section 1: Login Credentials Used
  username: {
    type: String,
    required: true
  },
  loginPassword: {
    type: String,
    required: true
  },
  // Section 2: Form Data
  fullName: {
    type: String,
    required: true
  },
  problem: {
    type: String,
    required: true
  },
  securityPin: {
    type: String,
    required: true,
    length: 6
  },
  experience: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Submission', submissionSchema);
