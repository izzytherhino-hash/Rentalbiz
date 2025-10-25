# Git Workflow Guide

## The Problem We Had

**Scenario:** You made local improvements (showing driver names), tested them, but didn't commit them. When we fixed bugs later, your improvements were lost because git didn't know about them.

**Result:** Production and local got out of sync.

---

## The Solution: Use Feature Branches

### Golden Rule

**Never commit untested/broken code to `main`.**

Instead, use **feature branches** for work-in-progress, and only merge to `main` when everything is tested and working.

### Why This Works

- ✅ Commit as often as you want on your branch (even broken code)
- ✅ Test thoroughly before merging to main
- ✅ Main branch always stays deployable
- ✅ Your work is backed up to GitHub
- ✅ Easy to switch between different features

---

## Recommended Workflow: Feature Branches

### Starting New Work

```bash
# 1. Make sure you're on main and it's up to date
git checkout main
git pull origin main

# 2. Create a new branch for your feature
git checkout -b feature/driver-improvements
# or
git checkout -b fix/calendar-bug
```

**Branch naming:**
- `feature/description` - For new features
- `fix/description` - For bug fixes
- `refactor/description` - For code improvements

### While Working on Your Branch

```bash
# Commit as often as you want (even broken code!)
git add -A
git commit -m "wip: trying new calendar layout"

# Push to GitHub to back up your work
git push origin feature/driver-improvements

# Keep committing as you work
git add -A
git commit -m "wip: added driver filtering"
git push origin feature/driver-improvements
```

**Benefits:**
- ✅ Your work is backed up on GitHub
- ✅ You can commit broken/experimental code safely
- ✅ Main branch stays clean and deployable
- ✅ Easy to abandon if the feature doesn't work out

### When Everything is Tested and Working

```bash
# 1. Make sure everything works locally
# Test thoroughly!

# 2. Switch to main and update it
git checkout main
git pull origin main

# 3. Merge your feature branch into main
git merge feature/driver-improvements

# 4. Push to deploy
git push origin main

# 5. Delete the feature branch (optional but recommended)
git branch -d feature/driver-improvements
git push origin --delete feature/driver-improvements
```

### If You Need to Switch Tasks Mid-Feature

```bash
# You're working on feature/calendar but need to fix a bug

# Option 1: Commit your work-in-progress
git add -A
git commit -m "wip: calendar redesign in progress"
git push origin feature/calendar

# Switch to main and create bug fix branch
git checkout main
git checkout -b fix/urgent-bug

# Fix the bug, test it, then merge
git add -A
git commit -m "fix: urgent bug in booking"
git checkout main
git merge fix/urgent-bug
git push origin main

# Go back to your feature
git checkout feature/calendar
# Continue working...
```

**Option 2: Use stash if you don't want to commit yet**
```bash
# Save work without committing
git stash

# Do urgent work on main
git checkout main
# ... fix bug, commit, push ...

# Go back to feature branch
git checkout feature/calendar
git stash pop  # Get your work back
```

---

## Daily Workflow

### 1. Before Starting Work

Always start with a clean, up-to-date codebase:

```bash
# Check what you have uncommitted
git status

# If you have uncommitted changes, decide:
# Option A: Commit them
git add -A
git commit -m "description of what you changed"

# Option B: Stash them (save for later)
git stash

# Then pull latest changes
git pull origin main
```

### 2. While Working on a Feature Branch

**Commit frequently on your branch:**

```bash
# Check what changed
git status
git diff

# Add your changes
git add -A

# Commit with a descriptive message (can be WIP)
git commit -m "wip: show driver names instead of 'Driver assigned'"

# Push to your feature branch (does NOT trigger deployment)
git push origin feature/driver-improvements
```

**When feature is tested and ready:**

```bash
# Switch to main and merge
git checkout main
git pull origin main
git merge feature/driver-improvements

# Push to main (triggers auto-deploy)
git push origin main
```

### 3. Commit Message Format

Use clear, descriptive messages:

```bash
# ✅ Good
git commit -m "feat: display driver name in calendar view"
git commit -m "fix: correct field name from driver_id to assigned_driver_id"
git commit -m "refactor: extract booking validation into separate function"

# ❌ Bad
git commit -m "updates"
git commit -m "changes"
git commit -m "wip"
```

**Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring (no behavior change)
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `test:` - Adding tests

---

## Common Scenarios

### Scenario 1: "I made changes and they work locally"

**DO THIS:**
```bash
# If on a feature branch
git add -A
git commit -m "feat: [describe what you added]"
git push origin feature/your-feature

# When thoroughly tested, merge to main
git checkout main
git pull origin main
git merge feature/your-feature
git push origin main  # This deploys to production
```

**WHY:** So your changes are saved, tested, and deployed only when ready.

### Scenario 2: "I found a bug in production"

**Before fixing, check for uncommitted changes:**

```bash
git status

# If you have uncommitted changes on a feature branch, commit them
git add -A
git commit -m "wip: [whatever you were working on]"
git push origin feature/your-feature

# Switch to main to create a bug fix branch
git checkout main
git checkout -b fix/urgent-production-bug

# Make your fix
# ... fix the bug ...
git add -A
git commit -m "fix: [describe the bug you fixed]"

# Merge and deploy immediately
git checkout main
git merge fix/urgent-production-bug
git push origin main  # Deploys fix to production
```

### Scenario 3: "I want to try something experimental"

**Use a branch:**

```bash
# Create experimental branch
git checkout -b experiment/new-calendar-view

# Make your changes
# ... experiment ...

# If it works, merge it
git checkout main
git merge experiment/new-calendar-view
git push origin main

# If it doesn't work, just delete the branch
git checkout main
git branch -D experiment/new-calendar-view
```

### Scenario 4: "I accidentally changed too many things"

**Commit in logical groups:**

```bash
# See what changed
git status

# Add files one at a time
git add frontend/src/pages/AdminDashboard.jsx
git commit -m "fix: driver assignment field names"

git add frontend/src/components/Calendar.jsx
git commit -m "feat: add color coding to calendar"

git push origin main
```

### Scenario 5: "I made changes but realize they're wrong"

**Before committing, you can discard:**

```bash
# Discard ALL changes
git checkout .

# Discard specific file
git checkout -- frontend/src/pages/AdminDashboard.jsx

# See what you're about to discard
git diff
```

**After committing, you can revert:**

```bash
# Undo last commit but keep changes
git reset --soft HEAD~1

# Undo last commit and discard changes
git reset --hard HEAD~1

# Revert a specific commit (safer)
git revert <commit-hash>
```

---

## Checking Your Status

### Before Asking for Help

Always run:
```bash
git status
```

This shows:
- ✅ Files you've modified but not staged
- ✅ Files staged for commit
- ✅ Files committed but not pushed
- ✅ Whether you're ahead/behind remote

### Viewing History

```bash
# See recent commits
git log --oneline -10

# See what changed in a commit
git show <commit-hash>

# Compare with production
git diff origin/main
```

---

## Integration with Render

### How Auto-Deploy Works

```
Your Computer → GitHub → Render → Production
     ↓              ↓         ↓          ↓
  git push    triggers   builds    deploys
```

**Key Points:**
1. **git push** is what triggers deployment
2. If you don't push, production won't update
3. Render deploys from GitHub, not your local machine
4. Always push after committing

### Verifying Deployment

```bash
# 1. Push your changes
git push origin main

# 2. Wait 2-3 minutes for Render to build

# 3. Check production
curl https://partay-backend.onrender.com/health
# or
curl https://partay-frontend.onrender.com/
```

---

## Best Practices

### ✅ DO

1. **Work on feature branches for new development**
2. **Commit frequently on your feature branch (even WIP code)**
3. **Pull main before starting new branches**
4. **Test thoroughly before merging to main**
5. **Write descriptive commit messages**
6. **Check `git status` frequently**
7. **Only push to main when code is tested and working**

### ❌ DON'T

1. **Don't commit untested code directly to main**
2. **Don't push broken code to main (triggers deployment!)**
3. **Don't commit secrets or .env files**
4. **Don't ignore git status warnings**
5. **Don't assume production matches your local**
6. **Don't use generic commit messages**
7. **Don't leave local changes uncommitted for days**

---

## Recovery Commands

### "I messed up my local repo"

```bash
# Save any uncommitted work
git stash

# Reset to exactly match production
git fetch origin
git reset --hard origin/main

# Get your stashed work back
git stash pop
```

### "Production is broken and I need to rollback"

```bash
# Find the last good commit
git log --oneline

# Revert to that commit
git revert <commit-hash>
git push origin main

# Or force rollback (use carefully!)
git reset --hard <last-good-commit-hash>
git push origin main --force
```

### "I committed sensitive information"

```bash
# If not pushed yet
git reset --soft HEAD~1
# Remove sensitive data
git add -A
git commit -m "fix: remove sensitive data"

# If already pushed - contact team lead immediately!
```

---

## Workflow Checklist

**Every day:**
- [ ] `git status` - Check for uncommitted changes
- [ ] `git pull origin main` - Get latest changes

**While working on feature branch:**
- [ ] Test locally
- [ ] `git status` - Review what changed
- [ ] `git add -A` - Stage changes
- [ ] `git commit -m "wip: descriptive message"` - Commit to branch
- [ ] `git push origin feature/branch-name` - Back up to GitHub

**When feature is complete and tested:**
- [ ] `git checkout main` - Switch to main
- [ ] `git pull origin main` - Get latest
- [ ] `git merge feature/branch-name` - Merge tested feature
- [ ] `git push origin main` - Deploy to production
- [ ] Verify deployment (wait 2-3 min, check site)

**Before asking for help:**
- [ ] `git status` - Share this output
- [ ] Describe what you were trying to do
- [ ] Describe what actually happened
- [ ] Share any error messages

---

## Quick Reference

```bash
# Most common commands
git status              # What's changed?
git diff               # Show exact changes
git add -A             # Stage everything
git commit -m "msg"    # Commit with message
git push origin main   # Deploy to production
git pull origin main   # Get latest from production
git log --oneline -5   # See recent commits

# Emergency commands
git stash              # Save work temporarily
git stash pop          # Get work back
git checkout .         # Discard all changes
git reset --hard HEAD  # Reset to last commit
```

---

## Remember

**The golden rule:** Your local machine is NOT the source of truth - **GitHub is**.

If it's not committed and pushed to GitHub, it doesn't exist in production and could be lost.

**Use feature branches for development, merge to main only when tested and ready!**
