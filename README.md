
# Repair Shop Management System

A comprehensive REST API for managing repair shop operations, including user management, truck tracking, driver management, and job card processing.

## 🚀 Features

- **Multi-role User Management**: Admin, Company, Employee, Truck Owner, General users
- **Driver Management**: Complete driver profiles with license tracking
- **Truck Management**: Track trucks, maintenance schedules, and ownership
- **Job Card System**: Manage repair/maintenance jobs with status tracking
- **Company Management**: Handle company profiles and employee relationships
- **Real-time Notifications**: System-wide notification management
- **Payment Processing**: Integrated payment gateway support
- **Role-based Access Control**: Secure endpoints with JWT authentication

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi schema validation
- **Security**: Helmet, Rate limiting, Input sanitization
- **Documentation**: Swagger/OpenAPI 3.0
- **Logging**: Winston
- **Phone Validation**: libphonenumber-js

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- Environment variables configured

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd repair-shop-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Access API Documentation**
   Visit `http://localhost:3000/api-docs` for Swagger documentation

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/reset-password` - Password reset

### User Management
- `GET /api/users` - Get all users (Admin/Employee only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Driver Management
- `POST /api/drivers` - Create new driver
- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/:id` - Get driver by ID
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health
- `GET /health/ready` - Readiness probe

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- Security headers with Helmet
- Password complexity requirements
- Phone number validation

## 📊 Monitoring & Logging

- Winston logger with multiple transports
- Request/response logging
- Error tracking and monitoring
- Health check endpoints
- Performance metrics

## 🚀 Deployment

This application is designed to be deployed on Replit with auto-scaling capabilities:

1. **Configure deployment settings**
2. **Set environment variables in Replit Secrets**
3. **Deploy using Replit's deployment feature**

## 📖 Documentation

- API documentation available at `/api-docs`
- Health monitoring at `/health`
- Comprehensive error handling and validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🛡️ Security

If you discover any security vulnerabilities, please report them responsibly.

## 📞 Support

For support and questions, please refer to the documentation or create an issue.
