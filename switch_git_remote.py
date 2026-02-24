#!/usr/bin/env python3
"""Toggle git remote for main branch and email between Apple internal and public GitHub."""

import subprocess

# Configuration
APPLE_EMAIL = "gaofeng_fan@apple.com"
PUBLIC_EMAIL = "circuitmuggle@gmail.com"


def run_git(args: list[str]) -> str:
    """Run a git command and return output."""
    return subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
    ).stdout.strip()


def main() -> None:
    # Use branch.main.remote to determine current state
    current_remote = run_git(["config", "branch.main.remote"])

    if current_remote == "enterprise":
        new_email, new_remote, target = PUBLIC_EMAIL, "origin", "Public GitHub"
    else:
        new_email, new_remote, target = APPLE_EMAIL, "enterprise", "Apple Internal"

    print(f"Switching to {target}...")
    run_git(["config", "user.email", new_email])
    run_git(["config", "branch.main.remote", new_remote])

    print(f"  Email:  {new_email}")
    print(f"  Remote: {new_remote} (branch main)")
    print("\nDone!")


if __name__ == "__main__":
    main()
