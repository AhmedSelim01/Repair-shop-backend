const WebSocket = require('ws');
const logger = require('../config/logger');

/**
 * REAL-TIME TRACKER
 * Advanced WebSocket system for live updates, tracking, and notifications
 * Features: truck tracking, job updates, real-time analytics, system notifications
 */
class RealTimeTracker {
    constructor() {
        this.connections = new Map(); // userId -> WebSocket connection
        this.truckLocations = new Map(); // truckId -> location data
        this.jobCardUpdates = new Map(); // jobCardId -> update data
        this.wsServer = null;
        this.heartbeatInterval = null;
    }

    // Initialize WebSocket server
    initialize(server) {
        this.wsServer = new WebSocket.Server({ 
            server,
            path: '/ws',
            verifyClient: this.verifyClient.bind(this)
        });
        
        this.wsServer.on('connection', (ws, req) => {
            logger.info('New WebSocket connection established', {
                ip: req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            });
            
            // Set up connection handlers
            this.setupConnectionHandlers(ws, req);
            
            // Send welcome message
            this.sendMessage(ws, {
                type: 'connection_established',
                data: {
                    timestamp: new Date().toISOString(),
                    message: 'Real-time connection established'
                }
            });
        });

        // Start heartbeat mechanism
        this.startHeartbeat();
        
        logger.info('Real-time tracker initialized with WebSocket server');
    }

    // Verify client connection
    verifyClient() {
        // Add authentication logic here if needed
        return true;
    }

    // Set up connection event handlers
    setupConnectionHandlers(ws) {
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                await this.handleMessage(ws, data);
            } catch (error) {
                logger.error('WebSocket message error:', error);
                this.sendMessage(ws, { 
                    type: 'error', 
                    data: { message: 'Invalid message format' }
                });
            }
        });

        ws.on('close', (code, reason) => {
            this.removeConnection(ws);
            logger.info('WebSocket connection closed', { 
                code, 
                reason: reason.toString(),
                userId: ws.userId 
            });
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
            this.removeConnection(ws);
        });

        ws.on('pong', () => {
            ws.isAlive = true;
        });
    }

    // Handle incoming WebSocket messages
    async handleMessage(ws, data) {
        const { type, payload } = data;

        try {
            switch (type) {
                case 'authenticate':
                    await this.handleAuthentication(ws, payload);
                    break;

                case 'subscribe_truck_updates':
                    this.subscribeTruckUpdates(ws, payload.truckId);
                    break;

                case 'update_truck_location':
                    await this.updateTruckLocation(payload);
                    break;

                case 'subscribe_job_updates':
                    this.subscribeJobUpdates(ws, payload.jobCardId);
                    break;

                case 'send_notification':
                    await this.sendNotificationToUser(payload);
                    break;

                case 'get_analytics':
                    this.sendAnalytics(ws);
                    break;

                default:
                    this.sendMessage(ws, {
                        type: 'error',
                        data: { message: `Unknown message type: ${type}` }
                    });
            }
        } catch (error) {
            logger.error('Message handling error:', error);
            this.sendMessage(ws, {
                type: 'error',
                data: { message: 'Failed to process message' }
            });
        }
    }

    // Handle user authentication
    async handleAuthentication(ws, payload) {
        const { userId, role } = payload;
        
        ws.userId = userId;
        ws.role = role;
        ws.isAuthenticated = true;
        
        this.connections.set(userId, ws);
        
        this.sendMessage(ws, {
            type: 'authenticated',
            data: {
                userId,
                timestamp: new Date().toISOString()
            }
        });

        logger.info('User authenticated via WebSocket', { userId, role });
    }

    // Subscribe to truck location updates
    subscribeTruckUpdates(ws, truckId) {
        if (!ws.subscribedTrucks) {
            ws.subscribedTrucks = new Set();
        }
        ws.subscribedTrucks.add(truckId);
        
        // Send current location if available
        const currentLocation = this.truckLocations.get(truckId);
        if (currentLocation) {
            this.sendMessage(ws, {
                type: 'truck_location_update',
                data: { truckId, location: currentLocation }
            });
        }
    }

    // Update truck location and broadcast to subscribers
    async updateTruckLocation(payload) {
        const { truckId, latitude, longitude, timestamp, speed, heading } = payload;
        
        const locationData = {
            latitude,
            longitude,
            timestamp: timestamp || new Date().toISOString(),
            speed: speed || 0,
            heading: heading || 0
        };

        this.truckLocations.set(truckId, locationData);

        // Broadcast to all subscribers
        this.connections.forEach((ws) => {
            if (ws.subscribedTrucks && ws.subscribedTrucks.has(truckId)) {
                this.sendMessage(ws, {
                    type: 'truck_location_update',
                    data: { truckId, location: locationData }
                });
            }
        });

        logger.info('Truck location updated', { truckId, latitude, longitude });
    }

    // Subscribe to job card updates
    subscribeJobUpdates(ws, jobCardId) {
        if (!ws.subscribedJobs) {
            ws.subscribedJobs = new Set();
        }
        ws.subscribedJobs.add(jobCardId);
    }

    // Broadcast job card update
    async broadcastJobUpdate(jobCardId, updateData) {
        this.connections.forEach((ws) => {
            if (ws.subscribedJobs && ws.subscribedJobs.has(jobCardId)) {
                this.sendMessage(ws, {
                    type: 'job_update',
                    data: { jobCardId, update: updateData }
                });
            }
        });

        logger.info('Job update broadcasted', { jobCardId, updateData });
    }

    // Send notification to specific user
    async sendNotificationToUser(payload) {
        const { userId, notification } = payload;
        const ws = this.connections.get(userId);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            this.sendMessage(ws, {
                type: 'notification',
                data: notification
            });
            
            logger.info('Notification sent to user', { userId, notificationId: notification.id });
        }
    }

    // Send analytics data
    sendAnalytics(ws) {
        const analytics = this.getAnalytics();
        this.sendMessage(ws, {
            type: 'analytics',
            data: analytics
        });
    }

    // Send message to WebSocket connection
    sendMessage(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    // Remove WebSocket connection
    removeConnection(ws) {
        if (ws.userId) {
            this.connections.delete(ws.userId);
        }
    }

    // Start heartbeat mechanism
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.connections.forEach((ws) => {
                if (ws.isAlive === false) {
                    this.removeConnection(ws);
                    return ws.terminate();
                }
                
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000); // 30 seconds
    }

    // Stop heartbeat mechanism
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }

    // Get real-time analytics
    getAnalytics() {
        return {
            activeConnections: this.connections.size,
            trackedTrucks: this.truckLocations.size,
            activeJobCards: this.jobCardUpdates.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            connectionsByRole: this.getConnectionsByRole()
        };
    }

    // Get connections grouped by role
    getConnectionsByRole() {
        const roleStats = {};
        this.connections.forEach((ws) => {
            if (ws.role) {
                roleStats[ws.role] = (roleStats[ws.role] || 0) + 1;
            }
        });
        return roleStats;
    }

    // Send system-wide notification
    broadcastNotification(message) {
        this.connections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                this.sendMessage(ws, {
                    type: 'system_notification',
                    data: message
                });
            }
        });

        logger.info('System notification broadcasted', { recipientCount: this.connections.size });
    }

    // Clean up resources
    cleanup() {
        this.stopHeartbeat();
        
        this.connections.forEach((ws) => {
            ws.close();
        });
        
        this.connections.clear();
        this.truckLocations.clear();
        this.jobCardUpdates.clear();
        
        if (this.wsServer) {
            this.wsServer.close();
        }
    }
}

// Export singleton instance
const realTimeTracker = new RealTimeTracker();
module.exports = realTimeTracker;
