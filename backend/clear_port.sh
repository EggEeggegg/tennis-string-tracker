#!/bin/bash

# Clear port 8080
PORT=8080

echo "🔍 Checking for processes on port $PORT..."

# Windows (Git Bash)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  PID=$(netstat -ano | grep ":$PORT " | awk '{print $NF}' | head -1)

  if [ -z "$PID" ]; then
    echo "✅ Port $PORT is free!"
    exit 0
  fi

  echo "⚠️  Found process PID: $PID"
  echo "🔫 Killing process on port $PORT..."
  taskkill.exe /PID "$PID" /F 2>/dev/null

  if [ $? -eq 0 ]; then
    echo "✅ Port $PORT is now free!"
  else
    echo "❌ Failed to kill process. Try: taskkill /PID $PID /F"
  fi

# Linux/Mac
else
  PID=$(lsof -ti:$PORT)

  if [ -z "$PID" ]; then
    echo "✅ Port $PORT is free!"
    exit 0
  fi

  echo "⚠️  Found process PID: $PID"
  echo "🔫 Killing process on port $PORT..."
  kill -9 $PID

  if [ $? -eq 0 ]; then
    echo "✅ Port $PORT is now free!"
  else
    echo "❌ Failed to kill process"
  fi
fi
