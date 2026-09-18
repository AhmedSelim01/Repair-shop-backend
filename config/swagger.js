const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Repair Shop Management API',
      version: '1.0.0',
      description: 'API for managing repair shop operations',
      contact: {
        name: 'API Support',
        email: process.env.EMAIL_USER || 'support@yourdomain.com' // Safely falls back
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? process.env.PRODUCTION_URL || 'https://api.yourdomain.com' // Generic fallback
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production'
          ? 'Production server'
          : `Development server (port: ${process.env.PORT || 3000})`
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./routes/*.js', './models/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  serveSwagger: (app, endpoint = '/api-docs') => {
    app.use(
      endpoint,
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        swaggerOptions: {
          persistAuthorization: true
        }
      })
    );
  }
};