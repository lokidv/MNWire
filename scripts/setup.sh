#!/usr/bin/env bash

# Ask user for other environment variables (except XUI_ since we'll get them after the installer)
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

# Run the 3x-ui installer script
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)

# Now fetch the newly generated XUI credentials and settings
XUI_INFO="$(x-ui settings)"
XUI_USERNAME=$(echo "$XUI_INFO" | grep "username:" | awk '{print $2}')
XUI_PASSWORD=$(echo "$XUI_INFO" | grep "password:" | awk '{print $2}')
XUI_PORT=$(echo "$XUI_INFO" | grep "port:" | awk '{print $2}')
XUI_WEB_BASE_PATH=$(echo "$XUI_INFO" | grep "webBasePath:" | awk '{print $2}')

# Clone the NestJS application repository
# TODO: Replace this with the actual repository URL
git clone https://github.com/lokidv/MNWire.git /opt/mnwire
cd /opt/mnwire

# Install dependencies and build the NestJS application
npm install
npm run build

# Write out the environment variables to a system-wide environment file
# Append them to /etc/environment so they are available system-wide
export XUI_USERNAME=${XUI_USERNAME}
export XUI_PASSWORD=${XUI_PASSWORD}
export XUI_PORT=${XUI_PORT}
export XUI_WEB_BASE_PATH=${XUI_WEB_BASE_PATH}
export WIREGUARD_INBOUND=${WIREGUARD_INBOUND}
export DATABASE_URL=${DATABASE_URL}
export PORT=${PORT}
export XUI_USE_SSL=${XUI_USE_SSL}
export API_PASSWORD=${API_PASSWORD}
export DATABASE_URL="file:./database.db"

npx prisma db push

# Run the NestJS app using pm2
pm2 start dist/main.js --name "mnwire"

# Save the pm2 process list so it can restart on reboot
pm2 save

echo "Installation and setup completed!"
echo "Your NestJS app is running under pm2 as 'mnwire'"
