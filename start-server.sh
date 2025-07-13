#!/bin/bash

echo "🚀 Starting Kaspa DApp with URL Shortener..."

# Start the shortener server in background
echo "📦 Starting URL shortener server..."
cd server
node shortener-server.js &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 2

# Start the main development server
echo "🌐 Starting main development server..."
npm run dev &
DEV_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $SERVER_PID 2>/dev/null
    kill $DEV_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT

echo ""
echo "✅ Servers running:"
echo "   📝 Main app: http://localhost:5173"
echo "   🔗 URL shortener: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $SERVER_PID $DEV_PID