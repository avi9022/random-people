#!/usr/bin/env bash
# One-time bootstrap script for a fresh Ubuntu 22.04 EC2 instance.
# Run as the `ubuntu` user with sudo available.
#
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/scripts/setup-server.sh | bash
#
# Or scp the repo up first and run from there.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Updating apt + installing build tools"
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates build-essential python3 nginx

echo "==> Installing Node 20 (NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Enabling corepack and activating pnpm 10.30.3"
sudo corepack enable
sudo corepack prepare pnpm@10.30.3 --activate

echo "==> Creating /opt/finq directory tree"
sudo mkdir -p /opt/finq/data
sudo chown -R "$USER":"$USER" /opt/finq
chmod 755 /opt/finq

echo "==> Installing systemd unit"
sudo cp "$SCRIPT_DIR/finq-server.service" /etc/systemd/system/finq-server.service
sudo systemctl daemon-reload
sudo systemctl enable finq-server

echo "==> Installing nginx site config"
sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/finq
sudo ln -sf /etc/nginx/sites-available/finq /etc/nginx/sites-enabled/finq
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Allowing the deploy user to restart the server without a password"
sudo tee /etc/sudoers.d/finq-deploy >/dev/null <<EOF
$USER ALL=(ALL) NOPASSWD: /bin/systemctl restart finq-server, /bin/systemctl status finq-server
EOF
sudo chmod 440 /etc/sudoers.d/finq-deploy

echo
echo "Bootstrap complete."
echo "Next steps (from your laptop / GitHub Actions):"
echo "  1. Add EC2_HOST, EC2_USER, EC2_SSH_KEY secrets in your GitHub repo."
echo "  2. Push to main — the workflow will deploy here."
echo
echo "The service will start automatically on the first deploy."
