#!/bin/bash

# Define colors for output
GREEN='\03{"033"}3[0;32m'
BLUE='\03{"033"}3[0;34m'
NC='\03{"033"}3[0m' # No Color

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}   Starting Tradify (Local)                    ${NC}"
echo -e "${GREEN}===============================================${NC}"

echo -e "${BLUE}[1/2] Starting Python FastAPI Backend...${NC}"
# Navigate to backend, activate virtual environment, and start Uvicorn in the background
cd backend
source ../.venv/bin/activate
# Export blank proxies so pip/requests don't get blocked by the university proxy
export http_proxy=""
export https_proxy=""
export HTTP_PROXY=""
export HTTPS_PROXY=""
uvicorn main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo -e "${BLUE}[2/2] Starting Next.js Frontend...${NC}"
# Navigate to frontend and start the Dev Server
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}Platform is fully booting up!${NC}"
echo -e "Frontend UI: http://localhost:3000"
echo -e "Backend API: http://127.0.0.1:8000"
echo -e "${GREEN}Press CTRL+C at any time to softly kill both servers.${NC}"
echo -e "${GREEN}===============================================${NC}"

# Wait for process termination
trap "echo 'Shutting down servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
