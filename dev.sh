#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SESSION_NAME="bezier-city"

echo -e "${GREEN}Starting Bezier City Development Environment with tmux${NC}"
echo "================================================"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}Error: tmux is not installed. Please install tmux first.${NC}"
    echo "On macOS: brew install tmux"
    echo "On Ubuntu/Debian: sudo apt-get install tmux"
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null

echo -e "\n${GREEN}Creating tmux session with backend and frontend panes...${NC}"

# Create new session with backend in first pane
tmux new-session -d -s "$SESSION_NAME" -c "$(pwd)/backend"
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🔧 Backend Server (Left Pane)'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Installing dependencies...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "poetry install" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Starting backend server on port 9000...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "poetry run uvicorn server:app --reload --host 0.0.0.0 --port 9000" C-m

# Split window vertically and start frontend in second pane
tmux split-window -h -t "$SESSION_NAME" -c "$(pwd)/frontend"
tmux send-keys -t "$SESSION_NAME:0.1" "echo '🌐 Frontend Server (Right Pane)'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Installing dependencies...'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "npm install" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Starting frontend server on port 9080...'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "npm run dev-nolog" C-m

# Display server information
echo -e "\n${GREEN}Servers are starting up...${NC}"
echo "================================================"
echo -e "Backend API: ${YELLOW}http://localhost:9000${NC}"
echo -e "Frontend:    ${YELLOW}http://localhost:9080${NC}"
echo -e "API Docs:    ${YELLOW}http://localhost:9000/docs${NC}"
echo "================================================"
echo -e "\n${BLUE}Tmux controls:${NC}"
echo -e "Attach to session:    ${YELLOW}tmux attach -t $SESSION_NAME${NC}"
echo -e "Switch between panes: ${YELLOW}Ctrl+B then Arrow Keys${NC}"
echo -e "Switch to left pane:  ${YELLOW}Ctrl+B then Left Arrow${NC}"
echo -e "Switch to right pane: ${YELLOW}Ctrl+B then Right Arrow${NC}"
echo -e "Detach from session:  ${YELLOW}Ctrl+B then D${NC}"
echo -e "Kill session:         ${YELLOW}tmux kill-session -t $SESSION_NAME${NC}"
echo "================================================"

# Wait for servers to start
sleep 3

# Attach to the session
echo -e "\n${GREEN}Attaching to tmux session...${NC}"
echo -e "${YELLOW}Use Ctrl+B then Arrow Keys to switch between panes${NC}"
echo -e "${YELLOW}Use Ctrl+B then D to detach and return to terminal${NC}\n"

exec tmux attach -t "$SESSION_NAME"