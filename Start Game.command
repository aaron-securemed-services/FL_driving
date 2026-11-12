#!/bin/bash
# Double-click this file on a Mac to start the game.
# It serves this folder on your own computer and opens the game in your browser.
# Close this window (or press Control-C) to stop.

cd "$(dirname "$0")" || exit 1

# Pick the first free port starting at 8000.
PORT=8000
while lsof -i "tcp:$PORT" >/dev/null 2>&1; do PORT=$((PORT + 1)); done
URL="http://localhost:$PORT/"

# Prefer Python 3; fall back to the Ruby that ships with macOS.
if [ -x /usr/bin/python3 ] && ! xcode-select -p >/dev/null 2>&1 && [ "$(command -v python3)" = "/usr/bin/python3" ]; then
  SERVER="ruby"   # /usr/bin/python3 is only a placeholder until Apple's developer tools are installed
elif command -v python3 >/dev/null 2>&1; then
  SERVER="python3"
else
  SERVER="ruby"
fi

echo "Sunshine Driving School"
echo "Game address: $URL"
echo "Leave this window open while you play. Close it to stop the game."
echo

# Open the browser once the server has had a moment to start.
( sleep 1.5; open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null ) &

if [ "$SERVER" = "python3" ]; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v ruby >/dev/null 2>&1; then
  exec ruby -run -e httpd . -p "$PORT" -b 127.0.0.1
else
  echo "Could not find Python 3 or Ruby on this Mac."
  echo "Install Python from https://www.python.org/downloads/ and try again."
  read -r -p "Press Return to close."
fi
