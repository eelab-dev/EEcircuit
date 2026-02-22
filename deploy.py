#!/usr/bin/env python3
"""Build and deploy EEcircuit to GitHub Pages on enterprise GitHub."""

import subprocess
import sys
import shutil
import tempfile
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

    # Check for uncommitted changes (excluding package-lock.json)
    status = run("git status --porcelain")
    dirty = [line for line in status.splitlines() if "package-lock.json" not in line]
    if dirty:
        print("ERROR: You have uncommitted changes. Commit or stash them first.")
        for line in dirty:
            print(f"  {line}")
        sys.exit(1)

    print("[1/5] Installing dependencies...")
    run("npm install --legacy-peer-deps")

    print("[2/5] Building project...")
    run("npm run build")

    # Copy dist to temp location
    dist_dir = REPO_DIR / "dist"
    if not dist_dir.exists():
        print("ERROR: dist/ not found after build")
        sys.exit(1)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_dist = Path(tmpdir) / "dist"
        shutil.copytree(dist_dir, tmp_dist)

        print("[3/5] Switching to gh-pages branch...")
        run("git stash --include-untracked")
        # Delete local gh-pages if it exists, then create fresh orphan
        subprocess.run("git branch -D gh-pages 2>/dev/null", shell=True, cwd=REPO_DIR)
        run("git switch --orphan gh-pages")
        # Remove all tracked and untracked files
        subprocess.run("git rm -rf --cached . > /dev/null 2>&1", shell=True, cwd=REPO_DIR)
        subprocess.run("git clean -fd > /dev/null 2>&1", shell=True, cwd=REPO_DIR)
        # Remove any leftover directories
        for item in REPO_DIR.iterdir():
            if item.name == ".git":
                continue
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()

        print("[4/5] Copying build output...")
        for item in tmp_dist.iterdir():
            dest = REPO_DIR / item.name
            if item.is_dir():
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)

        run("git add .")
        run('git commit -m "Deploy site"')

        print(f"[5/5] Pushing to {REMOTE}/{BRANCH}...")
        run(f"git push --force {REMOTE} {BRANCH}")

    # Switch back to main
    print("Restoring main branch...")
    # Remove deployed files before switching
    for item in REPO_DIR.iterdir():
        if item.name == ".git":
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()
    run("git switch main")
    run("git stash pop")

    print("\nDone! Site deployed to gh-pages branch.")
    print("URL: https://pages.github.pie.apple.com/gaofeng-fan/EEcircuit/")


if __name__ == "__main__":
    main()
