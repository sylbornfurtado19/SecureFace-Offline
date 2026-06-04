#!/usr/bin/env bash
set -euo pipefail

# Run this script on macOS to install CocoaPods for the iOS project.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods (pod) not found. Install it first: sudo gem install cocoapods"
  exit 1
fi

echo "Installing pods in $IOS_DIR"
cd "$IOS_DIR"
pod install --repo-update
echo "Pods installed. Open the iOS workspace in Xcode."
