#!/usr/bin/env bash
set -e

# JARVIS Companion Daemon LaunchAgent Installer
# Enables automatic start-at-login on macOS

JARVIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/com.jarvis.companion.plist"
LOG_OUT="/tmp/jarvis_companion.log"
LOG_ERR="/tmp/jarvis_companion.err"

echo "======================================================"
echo "⚡ Installing JARVIS Companion macOS Service"
echo "📁 Project Directory: $JARVIS_DIR"
echo "======================================================"

mkdir -p "$PLIST_DIR"

# Resolve node/npm binary locations
NODE_BIN="$(which node || echo "/usr/local/bin/node")"
NPM_BIN="$(which npm || echo "/usr/local/bin/npm")"
PATH_ENV="$PATH:/usr/local/bin:/opt/homebrew/bin"

# Unload previous service instance if active
if launchctl list | grep -q "com.jarvis.companion"; then
  echo "Stopping existing JARVIS companion service..."
  launchctl unload "$PLIST_FILE" 2>/dev/null || true
fi

# Write macOS LaunchAgent plist
cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jarvis.companion</string>
    <key>WorkingDirectory</key>
    <string>$JARVIS_DIR</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>-l</string>
        <string>-c</string>
        <string>npm run companion</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$PATH_ENV</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_OUT</string>
    <key>StandardErrorPath</key>
    <string>$LOG_ERR</string>
</dict>
</plist>
EOF

echo "✅ Created LaunchAgent at: $PLIST_FILE"

# Load LaunchAgent
launchctl load -w "$PLIST_FILE"

echo "🚀 Service registered and loaded."
echo "📜 stdout log: $LOG_OUT"
echo "📜 stderr log: $LOG_ERR"
echo "======================================================"
echo "JARVIS Companion will now start automatically at login."
echo "======================================================"
