#!/usr/bin/env bash
# Commit staged changes and push to main, tolerating a concurrent bot push.
#
# Several workflows commit evidence (rendered media, publish ledgers, QA
# records) back to main. They run close together, so two of them regularly
# race: one pushes between the other's `pull --rebase` and its `push`, and the
# loser fails the whole job. That is what killed Trend Video Factory run #2 and
# forced the "Retry ... after Git sync fix" cycle.
#
# Retries are bounded to three attempts. A push that still fails after that is
# a real problem and must surface as a job failure, not spin.
#
# Usage: tools/git-sync-push.sh "<commit message>" <path> [path ...]
set -euo pipefail

MESSAGE="${1:?commit message required}"
shift
if [ "$#" -eq 0 ]; then
  echo "git-sync-push: at least one path is required" >&2
  exit 2
fi

git add -- "$@"
if git diff --cached --quiet; then
  echo "git-sync-push: nothing to commit for: $*"
  exit 0
fi
git commit -m "$MESSAGE"

MAX_ATTEMPTS=3
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if git push origin HEAD:main; then
    echo "git-sync-push: pushed on attempt ${attempt}."
    exit 0
  fi
  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    break
  fi
  echo "git-sync-push: push rejected (attempt ${attempt}/${MAX_ATTEMPTS}); rebasing onto latest main."
  git pull --rebase origin main
  sleep $(( attempt * 3 ))
done

echo "git-sync-push: still could not push after ${MAX_ATTEMPTS} attempts. Failing loudly instead of retrying further." >&2
exit 1
