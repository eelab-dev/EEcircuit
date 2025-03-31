#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# Source directory where the original files are located
SOURCE_DIR="node_modules/eecircuit-schematic/dist/"

# Destination directory where files should be copied
DEST_DIR="./dist/assets"

# File pattern to match within the source directory
FILE_PATTERN="*.worker.js"

# --- Pre-flight Checks ---

# 1. Check if the source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory '$SOURCE_DIR' not found."
  echo "Please ensure 'npm install' or 'yarn install' has been run and the package exists."
  exit 1
fi

# 2. Ensure the destination directory exists (create if it doesn't)
#    The '-p' flag ensures that parent directories are also created if needed,
#    and it doesn't error if the directory already exists.
echo "Ensuring destination directory '$DEST_DIR' exists..."
mkdir -p "$DEST_DIR"
echo "Destination directory checked/created."

# --- Copy Operation ---

echo "Attempting to copy files matching '$FILE_PATTERN' from '$SOURCE_DIR' to '$DEST_DIR'..."

# Use the 'cp' command:
# -v : Verbose - print the name of each file before copying it. (Optional, but helpful)
# -f : Force - if an existing destination file cannot be opened, remove it and try again.
#      This effectively ensures replacement without prompting (unless the destination
#      is write-protected and cannot be removed).
# The source path uses the directory and the file pattern.
# The destination path is the target directory.
cp -vf "$SOURCE_DIR"/$FILE_PATTERN "$DEST_DIR"/

# Check the exit status of the cp command explicitly (optional, as set -e handles it)
if [ $? -eq 0 ]; then
  echo "Files copied successfully."
else
  # This message might not be reached if 'set -e' is active and cp fails,
  # but it's good practice in scripts without 'set -e'.
  echo "Error: File copy operation failed."
  exit 1
fi

exit 0