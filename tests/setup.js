/* eslint-env jest */
const mongoose = require('mongoose');

jest.setTimeout(30000);

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/repair-shop-test';

beforeAll(async () => {
  try {
    // Disconnect any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log('📡 Connecting to local MongoDB...');
    
    await mongoose.connect(TEST_DB_URI);
    
    console.log('✅ Test MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('💡 Make sure MongoDB service is running:');
    console.error('   Run: net start MongoDB');
    throw error;
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      // Drop test database
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    console.log('🧹 Test database cleaned');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});