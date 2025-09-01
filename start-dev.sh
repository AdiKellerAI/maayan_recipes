#!/bin/bash

# Maayan Recipes - Development Startup Script
# This script ensures both frontend and backend are running properly

echo "🚀 Starting Maayan Recipes Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if backend server is already running on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend server is already running on port 3001"
    echo "   Stopping existing server..."
    # Kill the process running on port 3001
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Check if frontend server is already running on port 5173
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Frontend server is already running on port 5173"
    echo "   You can access it at http://localhost:5173"
fi

echo "🔌 Testing PostgreSQL connection..."
# Test if we can connect to the database
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(client => {
    console.log('✅ PostgreSQL connection successful');
    client.release();
    pool.end();
  })
  .catch(err => {
    console.log('❌ PostgreSQL connection failed:', err.message);
    console.log('⚠️  The app will work with localStorage as fallback');
    pool.end();
  });
"

echo ""
echo "🚀 Starting development servers..."
echo "   - Frontend: http://localhost:5173"
echo "   - Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start both frontend and backend concurrently
npm run dev
