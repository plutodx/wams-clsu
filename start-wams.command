#!/bin/zsh
# Double-click to start WAMS (backend + frontend). Loads your shell PATH so npm is found.
cd "$(dirname "$0")"
ROOT="$(pwd)"

# Make sure node/npm are on PATH regardless of how this was launched
source "$HOME/.zprofile" 2>/dev/null
source "$HOME/.zshrc" 2>/dev/null
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" >/dev/null 2>&1

echo "==============================================="
echo "   Starting WAMS - please keep this window open"
echo "==============================================="
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found on PATH."; echo "PATH=$PATH"; exit 1; }

# Backend
cd "$ROOT/server" || exit 1
[ -d node_modules ] || { echo "Installing backend deps..."; npm install; }
echo ">> Starting backend on http://localhost:4000"
npm run dev &
BACK=$!

# Frontend
cd "$ROOT/client" || exit 1
[ -d node_modules ] || { echo "Installing frontend deps..."; npm install; }
( sleep 7; open http://localhost:5173 ) &
echo ">> Starting frontend on http://localhost:5173"
npm run dev

kill $BACK 2>/dev/null
