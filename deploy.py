#!/usr/bin/env python3
"""Build and deploy EEcircuit to GitHub Pages on enterprise GitHub using worktree."""

import subprocess
import sys
import shutil
import tempfile
import os
from pathlib import Path

REPO_DIR = Path(__file__).parent.resolve()
REMOTE = "enterprise"
BRANCH = "gh-pages"


def run(cmd, **kwargs):
    print(f"  → {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=REPO_DIR, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        print(f"  ✗ {result.stderr.strip()}")
        sys.exit(1)
    return result.stdout.strip()


def main():
    # Ensure we're on main
    current = run("git branch --show-current")
    if current != "main":
        print(f"ERROR: Expected to be on 'main', but on '{current}'")
        sys.exit(1)

    # Check for uncommitted changes
    status = run("git status --porcelain")
    if status:
        print("ERROR: You have uncommitted changes. Commit or stash them first.")
        print(status)
        sys.exit(1)

    print("[1/4] Building project...")
    run("npm run build")

    dist_dir = REPO_DIR / "dist"
    if not dist_dir.exists():
        print("ERROR: dist/ not found after build")
        sys.exit(1)

    # Use a worktree to deploy
    with tempfile.TemporaryDirectory() as tmpdir:
        deploy_dir = Path(tmpdir) / "deploy"
        
        print("[2/4] Preparing deployment directory...")
        # Remove worktree if it exists from a previous crash
        subprocess.run(f"git worktree remove -f {deploy_dir} 2>/dev/null", shell=True, cwd=REPO_DIR)
        
        # Create worktree for gh-pages
        run(f"git worktree add -B {BRANCH} {deploy_dir} origin/{BRANCH} 2>/dev/null || git worktree add --orphan {BRANCH} {deploy_dir}")

        print("[3/4] Copying build output...")
        # Clear worktree (except .git)
        for item in deploy_dir.iterdir():
            if item.name == ".git":
                continue
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()

        # Copy new build
        for item in dist_dir.iterdir():
            dest = deploy_dir / item.name
            if item.is_dir():
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)

        # Commit and push from worktree
        print(f"[4/4] Pushing to {REMOTE}/{BRANCH}...")
        subprocess.run("git add .", shell=True, cwd=deploy_dir)
        subprocess.run('git commit -m "Deploy site"', shell=True, cwd=deploy_dir)
        subprocess.run(f"git push --force {REMOTE} {BRANCH}", shell=True, cwd=deploy_dir)

        # Cleanup worktree
        print("Cleaning up...")
        subprocess.run(f"git worktree remove -f {deploy_dir}", shell=True, cwd=REPO_DIR)

    print("\nDone! Site deployed safely using worktrees.")
    print("Local node_modules were not touched.")
    print("URL: https://pages.github.pie.apple.com/gaofeng-fan/EEcircuit/")


if __name__ == "__main__":
    main()