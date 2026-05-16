#!/bin/bash
# Kill any process using port 5000

PORT=${1:-5000}

echo "Checking for processes on port $PORT..."

# Find and kill process using the port
PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "No process found on port $PORT"
else
  echo "Killing process $PID on port $PORT..."
  kill -9 $PID
  echo "Process killed successfully"
fi

# Made with Bob
