#!/bin/bash

# --- CONFIGURATION ---
DOMAIN="drauwper.com"      # Replace with your domain or IP
NODE_PORT=4000            # The port your Node.js app is running on
CONFIG_NAME="drauwper_app"    # Name for the Nginx config file

# 1. Update system and install Nginx
echo "Updating system and installing Nginx..."
sudo apt update && sudo apt install -y nginx

# 2. Create the Nginx server block configuration
echo "Creating Nginx configuration for $DOMAIN..."
sudo tee /etc/nginx/sites-available/$CONFIG_NAME <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$NODE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 3. Enable the configuration and disable the default site
echo "Enabling site and testing configuration..."
sudo ln -sf /etc/nginx/sites-available/$CONFIG_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Test and restart Nginx
sudo nginx -t && sudo systemctl restart nginx

echo "Setup complete! Nginx is now proxying to port $NODE_PORT."