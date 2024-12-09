#!/usr/bin/env bash

# Ask user for the environment variables (except DATABASE_URL)
read -p "Enter XUI_USERNAME (default: SEkW0S1QTv): " XUI_USERNAME
XUI_USERNAME=${XUI_USERNAME:-SEkW0S1QTv}

read -p "Enter XUI_PASSWORD (default: otoA5CBGT1): " XUI_PASSWORD
XUI_PASSWORD=${XUI_PASSWORD:-otoA5CBGT1}

read -p "Enter XUI_PORT (default: 3333): " XUI_PORT
XUI_PORT=${XUI_PORT:-3333}

read -p "Enter XUI_WEB_BASE_PATH (default: FuOb4JZF3EDMIvC): " XUI_WEB_BASE_PATH
XUI_WEB_BASE_PATH=${XUI_WEB_BASE_PATH:-FuOb4JZF3EDMIvC}

read -p "Enter WIREGUARD_INBOUND (default: 4): " WIREGUARD_INBOUND
WIREGUARD_INBOUND=${WIREGUARD_INBOUND:-4}

read -p "Enter PORT (default: 4500): " PORT
PORT=${PORT:-4500}

read -p "Enter XUI_USE_SSL (true/false) (default: false): " XUI_USE_SSL
XUI_USE_SSL=${XUI_USE_SSL:-false}

# NEW: Ask for API_PASSWORD for the NestJS application
read -s -p "Enter API_PASSWORD (no default, required): " API_PASSWORD
echo
if [ -z "$API_PASSWORD" ]; then
  echo "API_PASSWORD cannot be empty."
  exit 1
fi


# The DATABASE_URL is fixed
DATABASE_URL="file:./database.db"

# Update & install prerequisites
sudo apt-get update -y
sudo apt-get install -y curl git

# Install Node.js (LTS) from NodeSource
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install pm2@latest -g

# Run the 3x-ui installer script (this will ask more questions)
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)

# Clone the NestJS application repository
# TODO: Replace this with the actual repository URL
git clone https://github.com/username/repo.git /opt/my-nestjs-app
cd /opt/my-nestjs-app

# Install dependencies and build the NestJS application
npm install
npm run build

# Write out the environment variables to a system-wide environment file
# We can append them to /etc/environment so they are available system-wide
# Note: This requires sudo privileges.
{
  echo "XUI_USERNAME=${XUI_USERNAME}"
  echo "XUI_PASSWORD=${XUI_PASSWORD}"
  echo "XUI_PORT=${XUI_PORT}"
  echo "XUI_WEB_BASE_PATH=${XUI_WEB_BASE_PATH}"
  echo "WIREGUARD_INBOUND=${WIREGUARD_INBOUND}"
  echo "DATABASE_URL=${DATABASE_URL}"
  echo "PORT=${PORT}"
  echo "XUI_USE_SSL=${XUI_USE_SSL}"
} | sudo tee -a /etc/environment > /dev/null

# Reload environment variables from /etc/environment
source /etc/environment

# Run the NestJS app using pm2
# Assuming the build output is in dist/main.js (default for NestJS)
pm2 start dist/main.js --name "my-nestjs-app"

# Save the pm2 process list so it can restart on reboot
pm2 save

echo "Installation and setup completed!"
echo "Your NestJS app is running under pm2 as 'my-nestjs-app'"
