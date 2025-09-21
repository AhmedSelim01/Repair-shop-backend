
// Import testing dependencies
const request = require('supertest'); // HTTP assertion library for API testing
const app = require('../server'); // Express application instance
const User = require('../models/User'); // User model for database operations

/**
 * AUTHENTICATION ENDPOINTS TEST SUITE
 * Comprehensive testing for user registration and login functionality
 * Tests both success cases and various error scenarios
 */
describe('Authentication Endpoints', () => {
  // SETUP: Clean database before each test to ensure test isolation
  beforeEach(async () => {
    await User.deleteMany({}); // Remove all users from test database
  });

  /**
   * USER REGISTRATION TESTS
   * Tests the POST /api/auth/register endpoint
   * Covers successful registration and validation failures
   */
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // ARRANGE: Prepare valid user data for registration
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!', // Meets password complexity requirements
        role: 'general',
        name: 'Test User',
        phoneNumber: '+1234567890' // Valid international format
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        role: 'general'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'general',
        name: 'Test User'
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
