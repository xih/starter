#!/usr/bin/env bash
set -euo pipefail

worktree_path="${CODEX_WORKTREE_PATH:-$PWD}"
cd "$worktree_path"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a Git worktree; skipping Codex branch creation."
  exit 0
fi

if git symbolic-ref -q HEAD >/dev/null; then
  current_branch="$(git branch --show-current)"
  echo "Already on branch: $current_branch"
  exit 0
fi

slugify() {
  LC_ALL=C tr '[:upper:]' '[:lower:]' |
    sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g' |
    cut -c 1-60 |
    sed -E 's/-+$//'
}

thread_name=""
codex_home_path="${CODEX_HOME:-$HOME/.codex}"
thread_id="${CODEX_THREAD_ID:-}"

if [[ -n "$thread_id" && -f "$codex_home_path/session_index.jsonl" ]]; then
  thread_line="$(grep -F "\"id\":\"$thread_id\"" "$codex_home_path/session_index.jsonl" | tail -n 1 || true)"
  if [[ -n "$thread_line" ]]; then
    thread_name="$(printf '%s' "$thread_line" | sed -nE 's/.*"thread_name":"([^"]*)".*/\1/p')"
  fi
fi

slug=""

if [[ -n "${CODEX_TASK_SLUG:-}" ]]; then
  slug="$(printf '%s' "$CODEX_TASK_SLUG" | slugify)"
fi

if [[ -z "$slug" && -n "${CODEX_TASK_NAME:-}" ]]; then
  slug="$(printf '%s' "$CODEX_TASK_NAME" | slugify)"
fi

if [[ -z "$slug" && -n "$thread_name" ]]; then
  slug="$(printf '%s' "$thread_name" | slugify)"
fi

if [[ -z "$slug" ]]; then
  parent_dir="$(basename "$(dirname "$worktree_path")")"
  slug="$(printf '%s' "$parent_dir" | slugify)"
fi

if [[ -z "$slug" || "$slug" =~ ^[0-9a-f]{4}$ ]]; then
  slug="codex-worktree-$(date +%Y%m%d-%H%M%S)"
fi

branch_base="codex/$slug"
branch_name="$branch_base"
suffix=2

branch_ref_conflicts() {
  local candidate="$1"
  local ref="refs/heads/$candidate"
  local prefix="$candidate"

  if git show-ref --verify --quiet "$ref"; then
    return 0
  fi

  if git for-each-ref --format='%(refname)' "$ref/" | grep -q .; then
    return 0
  fi

  while [[ "$prefix" == */* ]]; do
    prefix="${prefix%/*}"
    if git show-ref --verify --quiet "refs/heads/$prefix"; then
      return 0
    fi
  done

  return 1
}

while branch_ref_conflicts "$branch_name"; do
  branch_name="$branch_base-$suffix"
  suffix=$((suffix + 1))
done

git switch -c "$branch_name"
echo "Created branch: $branch_name"
