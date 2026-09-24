#!/usr/bin/env bash
set -e

# JARVIS Companion Daemon LaunchAgent Uninstaller

PLIST_FILE="$HOME/Library/LaunchAgents/com.jarvis.companion.plist"

echo "======================================================"
echo "⚡ Removing JARVIS Companion macOS Service"
echo "======================================================"

if [ -f "$PLIST_FILE" ]; then
  launchctl unload "$PLIST_FILE" 2>/dev/null || true
  rm -f "$PLIST_FILE"
  echo "✅ LaunchAgent removed from $PLIST_FILE"
else
  echo "ℹ️ No LaunchAgent file found at $PLIST_FILE"
fi

echo "JARVIS Companion service uninstalled."
