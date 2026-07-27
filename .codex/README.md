# Codex Local Environment

Codex Desktop starts managed worktrees in detached HEAD by default. The local
environment setup script should create a readable branch immediately so commits
and later handoff work have a stable name.

Add this near the top of the Codex Desktop local environment setup script:

```bash
cd "$CODEX_WORKTREE_PATH"
.codex/scripts/create-codex-worktree-branch.sh
```

Keep dependency installation after the branch creation command.
