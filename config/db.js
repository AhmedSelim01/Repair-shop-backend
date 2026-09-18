// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (process.env.NODE_ENV === 'test') {
      console.log('Test environment: MongoDB connection handled by test setup');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;