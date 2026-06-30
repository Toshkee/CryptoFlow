#!/usr/bin/env bash
#
# scrub-secrets.sh — one-off: remove committed secrets from ALL git history,
# then force-push the cleaned history to GitHub.
#
#   • Removes  backend/.env  and  frontend/.env  from every commit
#     (these held the Cloudinary / Binance / CoinGecko keys).
#   • Scrubs the old hardcoded Django SECRET_KEY from old settings.py,
#     while KEEPING the current "django-insecure-dev-only-..." fallback.
#
# PRE-REQS — do these FIRST:
#   1. You have ALREADY rotated/revoked every leaked key. (Rotation is the real
#      fix; this only cleans the public repo so the dead strings stop showing.)
#   2. Working tree is clean (commit or stash anything in progress).
#
# This REWRITES history (every commit SHA changes) and FORCE-PUSHES. A full
# backup is made first, and the push is gated behind a typed confirmation.
# Run from anywhere:  bash scrub-secrets.sh
#
set -euo pipefail

REPO="/Users/toshkee/code/ga/projects/CryptoFlow"
cd "$REPO"
echo "▶ Repo: $REPO"

# ── 0. Tooling ──────────────────────────────────────────────────────────────
if ! git filter-repo --version >/dev/null 2>&1; then
  echo "▶ Installing git-filter-repo…"
  pip install git-filter-repo
fi

# ── 1. Refuse to run on a dirty tree ────────────────────────────────────────
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "✗ Working tree has uncommitted changes. Commit or stash them first:"
  git status --short
  exit 1
fi

# ── 2. Capture remotes (filter-repo strips them) ────────────────────────────
ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
HEROKU_URL="$(git remote get-url heroku 2>/dev/null || true)"

# ── 3. Full safety backup (restore with: git clone <backup> CryptoFlow) ─────
BACKUP="$REPO/../CryptoFlow-backup-$(git rev-parse --short HEAD).git"
echo "▶ Backup → $BACKUP"
rm -rf "$BACKUP"
git clone --mirror . "$BACKUP" >/dev/null
echo "  (undo everything later with:  rm -rf '$REPO' && git clone '$BACKUP' CryptoFlow )"

# ── 4. Build exact-literal replacements for hardcoded SECRET_KEYs ───────────
#     Grep every .py blob in history for django-insecure-* values, drop the
#     current dev-only fallback and any doc "..." placeholders. Writes literals
#     to a local file (never committed); deleted right after use.
REPL="$REPO/.cf-replacements.txt"
git rev-list --all | while read -r c; do
  git grep -hoE "django-insecure-[^\"' ]+" "$c" -- '*.py' 2>/dev/null || true
done | sort -u \
  | grep -v 'dev-only-key-do-not-use-in-production' \
  | grep -vE '\.\.\.|…' \
  | sed 's/$/==>***REMOVED***/' > "$REPL" || true
echo "▶ SECRET_KEY literals to scrub: $(grep -c . "$REPL" 2>/dev/null || echo 0)"

# ── 5. Rewrite history ──────────────────────────────────────────────────────
echo "▶ Pass 1/2 — removing backend/.env and frontend/.env from all history…"
git filter-repo --force --invert-paths --path backend/.env --path frontend/.env

if [ -s "$REPL" ]; then
  echo "▶ Pass 2/2 — scrubbing old hardcoded SECRET_KEY values…"
  git filter-repo --force --replace-text "$REPL"
fi
rm -f "$REPL"

# ── 6. Verify the cleaned history ───────────────────────────────────────────
echo "▶ Verifying…"
FAIL=0
if git log --all --full-history --oneline -- backend/.env frontend/.env | grep -q .; then
  echo "  ✗ .env still present in history"; FAIL=1
else echo "  ✓ no .env in history"; fi
LEFT="$(git rev-list --all | while read -r c; do git grep -hoE "django-insecure-[^\"' ]+" "$c" -- '*.py' 2>/dev/null || true; done \
        | sort -u | grep -v 'dev-only-key-do-not-use-in-production' | grep -vE '\.\.\.|…' || true)"
if [ -n "$LEFT" ]; then echo "  ✗ a non-dev SECRET_KEY is still in history"; FAIL=1
else echo "  ✓ no leaked SECRET_KEY in history"; fi
[ "$FAIL" -eq 0 ] || { echo "✗ Verification failed — NOT pushing. Backup is intact."; exit 1; }

# ── 7. Re-add remotes ───────────────────────────────────────────────────────
[ -n "$ORIGIN_URL" ] && git remote add origin "$ORIGIN_URL" 2>/dev/null || true
[ -n "$HEROKU_URL" ] && git remote add heroku "$HEROKU_URL" 2>/dev/null || true

# ── 8. Force-push (explicit gate) ───────────────────────────────────────────
echo
echo "Local history is clean. Ready to FORCE-PUSH to:  $ORIGIN_URL"
echo "This overwrites all branches + tags on GitHub. (Backup: $BACKUP)"
read -r -p 'Type YES to push: ' ANS
if [ "$ANS" = "YES" ]; then
  git push origin --force --all
  git push origin --force --tags
  echo "✓ Pushed cleaned history to origin."
  [ -n "$HEROKU_URL" ] && echo "↪ To update Heroku too:  git push heroku --force main"
else
  echo "Skipped push. When ready, run:"
  echo "    git push origin --force --all && git push origin --force --tags"
fi
echo "✓ Done.  You can delete this script:  rm '$REPO/scrub-secrets.sh'"
