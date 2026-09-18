
#!/bin/bash

# 🚀 Repair Shop API Deployment Script

set -e  # Exit on any error

echo "🔧 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env() {
    print_status "Checking environment variables..."
    
    if [ -z "$MONGODB_URI" ]; then
        print_error "MONGODB_URI is not set"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET is not set"
        exit 1
    fi
    
    print_status "Environment variables are properly configured"
}

# Install dependencies
install_deps() {
    print_status "Installing production dependencies..."
    npm ci --only=production
    print_status "Dependencies installed successfully"
}

# Run health checks
health_check() {
    print_status "Running pre-deployment health checks..."
    
    # Check if MongoDB is accessible
    node -e "
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGODB_URI)
            .then(() => {
                console.log('✅ Database connection successful');
                process.exit(0);
            })
            .catch(err => {
                console.error('❌ Database connection failed:', err.message);
                process.exit(1);
            });
    "
}

# Main deployment function
deploy() {
    print_status "🚀 Deploying Repair Shop API..."
    
    check_env
    install_deps
    health_check
    
    print_status "Starting the application..."
    exec node server.js
}

# Run deployment
deploy
