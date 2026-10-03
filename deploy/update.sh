#!/usr/bin/env bash
# Pull the latest site and restart the service.  Usage: sudo /var/www/notelkz/deploy/update.sh
set -euo pipefail
cd /var/www/notelkz
git pull --ff-only
systemctl restart notelkz-core
echo "Updated to $(git log -1 --format='%h %s')"
