#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Bezier City Development Environment${NC}"
echo "================================================"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    # Kill all child processes
    pkill -P $$
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup INT TERM EXIT

# Start backend server
echo -e "\n${GREEN}Starting Backend Server...${NC}"
cd backend
poetry install > /dev/null 2>&1
poetry run uvicorn server:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo -e "\n${GREEN}Starting Frontend Server...${NC}"
cd frontend
npm install > /dev/null 2>&1
npm run dev-nolog &
FRONTEND_PID=$!
cd ..

# Display server information
echo -e "\n${GREEN}Servers are starting up...${NC}"
echo "================================================"
echo -e "Backend API: ${YELLOW}http://localhost:8000${NC}"
echo -e "Frontend:    ${YELLOW}http://localhost:8080${NC}"
echo -e "API Docs:    ${YELLOW}http://localhost:8000/docs${NC}"
echo "================================================"
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}\n"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID