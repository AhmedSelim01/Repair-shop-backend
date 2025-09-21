/**
 * PAYMENT INTEGRATION TESTS
 * Tests payment flows, validation, and error handling
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const JobCard = require('../models/JobCard');
const Payment = require('../models/Payment');
const Truck = require('../models/Truck');

// Test database connection
const connectTestDB = async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/repair_shop_test';
    await mongoose.connect(mongoUri);
};

// Clean up test data
const cleanupTestData = async () => {
    await User.deleteMany({});
    await Truck.deleteMany({});
    await JobCard.deleteMany({});
    await Payment.deleteMany({});
};

describe('Payment Integration Tests', () => {
    let authToken;
    let testUser;
    let testTruck;
    let testJobCard;

    beforeAll(async () => {
        await connectTestDB();
        await cleanupTestData();

        // Create test user
        testUser = await User.create({
            name: 'Test User',
            email: 'test@payment.com',
            phone: '+971501234567',
            password: 'TestPass123!',
            role: 'truck_owner',
            licensePlate: 'ABC123'
        });

        testTruck = await Truck.create({
            licensePlate: 'ABC123',
            brand: 'Mercedes',
            owner: testUser._id,
            status: 'bending'
        });

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@payment.com',
                password: 'TestPass123!'
            });

        authToken = loginResponse.body.token;

        // Create test job card
        testJobCard = await JobCard.create({
            truckId: testTruck._id,
            status: 'completed',
            description: [{
                partName: 'Test Part',
                partCost: '300',
                repairFees: '200'
            }],
        });
    });

    afterAll(async () => {
        await cleanupTestData();
        await mongoose.connection.close();
    });

    describe('POST /api/payments/process', () => {
        it('should process cash payment successfully', async () => {
            const paymentData = {
                amount: 500,
                paymentMethod: 'cash',
                jobCardId: testJobCard._id,
                customerId: testUser._id
            };

            const response = await request(app)
                .post('/api/payments/process')
                .set('Authorization', `Bearer ${authToken}`)
                .send(paymentData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.payment.paymentStatus).toBe('completed');
            expect(response.body.data.payment.paymentMethod).toBe('cash');
        });

        it('should handle invalid payment data', async () => {
            const invalidData = {
                amount: -100, // Invalid amount
                paymentMethod: 'cash',
                jobCardId: testJobCard._id
            };

            const response = await request(app)
                .post('/api/payments/process')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('validation');
        });

        it('should require authentication', async () => {
            const paymentData = {
                amount: 500,
                paymentMethod: 'cash',
                jobCardId: testJobCard._id
            };

            const response = await request(app)
                .post('/api/payments/process')
                .send(paymentData)
                .expect(401);

            expect(response.body).toHaveProperty('success', false); // Jest assertion
        });
    });

    describe('GET /api/payments/history', () => {
        it('should retrieve payment history', async () => {
            const response = await request(app)
                .get('/api/payments/history')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.payments)).toBe(true);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/payments/history?page=1&limit=5')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data.pagination).toBeDefined();
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(5);
        });
    });

    describe('GET /api/payments/analytics', () => {
        it('should return payment analytics for admin', async () => {
            // Create admin user
            await User.create({
                name: 'Admin User',
                email: 'admin@test.com',
                password: 'AdminPass123!',
                role: 'admin'
            });

            const adminLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@test.com',
                    password: 'AdminPass123!'
                });

            const response = await request(app)
                .get('/api/payments/analytics')
                .set('Authorization', `Bearer ${adminLogin.body.token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.analytics).toBeDefined();
        });
    });
});