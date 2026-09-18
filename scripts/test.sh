
#!/bin/bash

# 🧪 Comprehensive Test Runner for Repair Shop API

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN} $1 ${NC}"
    echo -e "${GREEN}============================================${NC}\n"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Set test environment
export NODE_ENV=test
export JWT_SECRET=test_jwt_secret_key_for_testing
export MONGODB_URI=mongodb://localhost:27017/repair_shop_test

print_header "REPAIR SHOP API - COMPREHENSIVE TEST SUITE"

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Lint code
print_header "CODE QUALITY CHECKS"
print_status "Running ESLint..."
npx eslint . --ext .js --format=stylish

# Security audit
print_status "Running security audit..."
npm audit --audit-level moderate

# Run unit tests
print_header "UNIT TESTS"
print_status "Running Jest tests..."
npm test

# Run integration tests
print_header "INTEGRATION TESTS"
print_status "Running integration tests..."
node tests/test-runner.js

# Generate coverage report
print_header "COVERAGE REPORT"
print_status "Generating test coverage..."
npm run test:coverage

# API endpoint tests
print_header "API ENDPOINT TESTING"
print_status "Testing API endpoints..."
echo "Use Thunder Client collection: tests/thunder-client-tests.txt"

print_header "TEST SUITE COMPLETED SUCCESSFULLY"
print_status "All tests passed! 🎉"
print_status "Coverage report available in: coverage/lcov-report/index.html"
