#!/bin/bash
# FASE 7.2 — SYSTEMD SETUP SCRIPT
#
# This script sets up systemd services for Tokotani Online
# Run as root: sudo bash deploy/systemd-setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_USER="${SERVICE_USER:-www-data}"
APP_DIR="${APP_DIR:-/opt/tokotani-online-nextjs}"

echo "🔧 FASE 7.2 — Setting up systemd services..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root: sudo bash deploy/systemd-setup.sh"
    exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creating app directory: $APP_DIR"
    mkdir -p "$APP_DIR"
fi

# Copy service files
echo "📋 Copying systemd service files..."
cp "$SCRIPT_DIR/tokotani-nextjs.service" /etc/systemd/system/
cp "$SCRIPT_DIR/tokotani-engine-hub.service" /etc/systemd/system/

# Create override directories for ENV vars
echo "📝 Creating override directories for environment variables..."
mkdir -p /etc/systemd/system/tokotani-nextjs.service.d
mkdir -p /etc/systemd/system/tokotani-engine-hub.service.d

# Create example override files
cat > /etc/systemd/system/tokotani-nextjs.service.d/override.conf.example << 'EOF'
# FASE 7.1: Production Environment Variables
# Copy this file to override.conf and set your actual values
# DO NOT commit override.conf to git!

[Service]
Environment="DATABASE_URL=postgresql://user:password@localhost:5432/tokotani"
Environment="NEXTAUTH_SECRET=your-secret-here-min-32-chars"
Environment="NEXTAUTH_URL=https://yourdomain.com"
Environment="OPENAI_API_KEY=sk-..."
Environment="ENGINE_HUB_URL=http://localhost:8090"
EOF

cat > /etc/systemd/system/tokotani-engine-hub.service.d/override.conf.example << 'EOF'
# FASE 7.1: Production Environment Variables
# Copy this file to override.conf and set your actual values
# DO NOT commit override.conf to git!

[Service]
Environment="OPENAI_API_KEY=sk-..."
Environment="DATABASE_URL=postgresql://user:password@localhost:5432/tokotani"
EOF

echo "⚠️  IMPORTANT: Edit override.conf files and set your environment variables:"
echo "   - /etc/systemd/system/tokotani-nextjs.service.d/override.conf"
echo "   - /etc/systemd/system/tokotani-engine-hub.service.d/override.conf"

# Set permissions
echo "🔐 Setting permissions..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR" 2>/dev/null || true

# Create log directories
echo "📁 Creating log directories..."
mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/engine-hub/logs"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/logs" "$APP_DIR/engine-hub/logs" 2>/dev/null || true

# Reload systemd
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

echo ""
echo "✅ Systemd services installed!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit override.conf files and set environment variables"
echo "   2. Build the Go binary: cd engine-hub && go build -o bin/server cmd/server/main.go"
echo "   3. Enable services:"
echo "      sudo systemctl enable tokotani-nextjs"
echo "      sudo systemctl enable tokotani-engine-hub"
echo "   4. Start services:"
echo "      sudo systemctl start tokotani-nextjs"
echo "      sudo systemctl start tokotani-engine-hub"
echo "   5. Check status:"
echo "      sudo systemctl status tokotani-nextjs"
echo "      sudo systemctl status tokotani-engine-hub"
echo "   6. View logs:"
echo "      sudo journalctl -u tokotani-nextjs -f"
echo "      sudo journalctl -u tokotani-engine-hub -f"
