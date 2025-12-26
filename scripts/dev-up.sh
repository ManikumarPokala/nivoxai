#!/usr/bin/env sh
set -e

OS_NAME=$(uname -s)

if [ "$OS_NAME" = "Darwin" ]; then
  echo "Detected macOS. Ensure Docker Desktop is installed and running."
  echo "Starting dev stack..."
  docker compose up -d --build
  exit 0
fi

if [ "$OS_NAME" = "Linux" ]; then
  echo "Detected Linux. Ensure Docker Engine is installed and the Docker daemon is running."
  echo "Starting dev stack..."
  docker compose up -d --build
  exit 0
fi

echo "Unsupported OS: $OS_NAME"
exit 1
