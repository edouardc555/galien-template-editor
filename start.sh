#!/bin/bash
# Start template-editor server + open in browser

# Check if server already running
if lsof -ti :3456 > /dev/null 2>&1; then
  echo "✓ Server already running"
else
  cd ~/template-editor
  nohup node server.js > server.log 2>&1 &
  sleep 0.5
  echo "✓ Server started (PID $!)"
fi

# Open template editor
open ~/template-editor/index.html
