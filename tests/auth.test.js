const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
require('./setup');

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+971501234567',
        password: 'SecurePass123!',
        role: 'general'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // NO data wrapper - direct fields
      expect(response.body.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        phone: '+971501234567',
        password: 'SecurePass123!',
        role: 'general'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect([400, 500]).toContain(response.status);
      expect(response.body.success || false).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+971501234567',
        password: 'SecurePass123!',
        role: 'general'
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
      expect(response.body.email).toBe('test@example.com');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect([400, 401]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });
});