/**
 * PAYMENT INTEGRATION TESTS
 * Tests payment flows, validation, and error handling
 */
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const JobCard = require('../models/JobCard');
const Truck = require('../models/Truck');
require('./setup');

describe('Payment Integration Tests', () => {
    let authToken;
    let adminToken;
    let testUser;
    let testTruck;
    let testJobCard;

    beforeAll(async () => {
        // Create test user (truck owner)
        testUser = await User.create({
            name: 'Test User',
            email: 'test@payment.com',
            phone: '+971501234567',
            password: 'TestPass123!',
            role: 'truck_owner',
            licensePlate: 'ABC123'
        });

        // Create test truck
        testTruck = await Truck.create({
            licensePlate: 'ABC123',
            brand: 'Mercedes',
            owner: testUser._id,
            status: 'pending'
        });

        // Create test JobCard
        testJobCard = await JobCard.create({
            truckId: testTruck._id,
            customerId: testUser._id,
            status: 'completed',
            estimatedCost: 500,
            description: [
                {
                    partName: 'Test Part',
                    partCost: 300,
                    repairFee: 200
                }
            ]
        });

        // Create admin user
        await User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            phone: '+971509876543',
            password: 'AdminPass123!',
            role: 'admin'
        });

        // Login truck owner
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@payment.com',
                password: 'TestPass123!'
            });

        // Login admin
        const adminLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'AdminPass123!'
            });

        authToken = loginResponse.body.token;
        adminToken = adminLoginResponse.body.token;

        console.log('✅ Test setup complete');
        console.log('Auth token:', authToken ? 'EXISTS' : 'MISSING');
        console.log('Admin token:', adminToken ? 'EXISTS' : 'MISSING');
    });

    describe('POST /api/payments/jobcard', () => {
        it('should process job card payment successfully', async () => {
            const paymentData = {
                jobCardId: testJobCard._id.toString(),
                amount: 500,
                currency: 'AED',
                paymentMethod: 'credit_card',
                cardToken: 'tok_test_123'
            };

            const response = await request(app)
                .post('/api/payments/jobcard')
                .set('Authorization', `Bearer ${authToken}`)
                .send(paymentData);

            console.log('Payment response:', response.status, response.body);

            expect([200, 201]).toContain(response.status);
            if (response.body.success !== undefined) {
                expect(response.body.success).toBe(true);
            }
        });

        it('should handle invalid payment data', async () => {
            const invalidData = {
                jobCardId: 'invalid-id',
                amount: -10
            };

            const response = await request(app)
                .post('/api/payments/jobcard')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData);

            expect([400, 404, 500]).toContain(response.status);
        });

        it('should require authentication', async () => {
            const paymentData = {
                jobCardId: testJobCard._id.toString(),
                amount: 500
            };

            const response = await request(app)
                .post('/api/payments/jobcard')
                .send(paymentData);

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/payments', () => {
        it('should retrieve payment history', async () => {
            const response = await request(app)
                .get('/api/payments')
                .set('Authorization', `Bearer ${authToken}`);

            console.log('History response:', response.status);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/payments?page=1&limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/payments/analytics', () => {
        it('should return payment analytics for admin', async () => {
            const response = await request(app)
                .get('/api/payments/analytics')
                .set('Authorization', `Bearer ${adminToken}`);

            console.log('Analytics response:', response.status, response.body);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});