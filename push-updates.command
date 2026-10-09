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

# Clear any stale lock files left by a crashed git run
rm -f .git/index.lock .git/HEAD.lock .git/objects/maintenance.lock 2>/dev/null

# Make sure git knows who is committing (required, or commit silently fails)
if [ -z "$(git config user.email)" ]; then
  git config user.email "joy@luxurysocalrealty.com"
  git config user.name "WAMS CLSU"
  echo ">> Set git identity for this project."
fi

git add -A

# Commit. If there is genuinely nothing to commit, say so but keep going.
if git commit -m "Update WAMS: Gmail API email for live site ($(date '+%Y-%m-%d %H:%M'))"; then
  echo ">> Changes committed."
else
  echo "(nothing new to commit - will still try to push what's here)"
fi

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
echo "After it says SUCCESS, go back to Claude and say 'pushed'."
read "?Press Return to close this window..."
