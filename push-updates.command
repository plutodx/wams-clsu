#!/bin/zsh
# Double-click to push the latest WAMS code to GitHub.
# Netlify (front-end) and your host (back-end) redeploy automatically from GitHub.
cd "$(dirname "$0")"

# Make sure git is found regardless of how this was launched
source "$HOME/.zprofile" 2>/dev/null
source "$HOME/.zshrc" 2>/dev/null
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

echo "==============================================="
echo "   Pushing WAMS updates to GitHub"
echo "==============================================="

command -v git >/dev/null 2>&1 || { echo "ERROR: git is not installed."; echo "Install it from https://git-scm.com or use GitHub Desktop instead."; echo; read "?Press Return to close..."; exit 1; }

git add -A
git commit -m "Fix signature display after login, add email notifications + password reset, Mailjet support" || echo "(nothing new to commit)"

echo
echo ">> Pushing..."
if git push origin main; then
  echo
  echo "SUCCESS. GitHub is updated. Netlify and your host will redeploy in a minute or two."
else
  echo
  echo "Normal push was rejected (the online repo has changes not in this copy)."
  echo "Replacing the online code with this complete, up-to-date copy..."
  if git push --force origin main; then
    echo
    echo "SUCCESS (forced). GitHub is updated. Netlify and your host will redeploy shortly."
  else
    echo
    echo "PUSH FAILED. This usually means git on this Mac is not signed in to GitHub."
    echo "Easiest fix: open GitHub Desktop, which signs you in with a few clicks,"
    echo "then use its 'Push origin' button. Or run 'git push' after signing in."
  fi
fi

echo
read "?Press Return to close this window..."
