#!/bin/bash

# Run this as root on a fresh VPS with Debian 7 x64

# Install Dependencies
apt-get update && apt-get upgrade -y
apt-get install -y git
apt-get install -y sudo
apt-get install -y build-essential
apt-get install -y supervisor

# Node setup
NODE_VERSION=0.10.18
git clone git://github.com/creationix/nvm.git /nvm
source /nvm/nvm.sh
nvm install $NODE_VERSION
nvm alias default $NODE_VERSION
ln /nvm/v$NODE_VERSION/bin/node /usr/bin/node
ln /nvm/v$NODE_VERSION/bin/npm /usr/bin/npm

npm install -g bower
npm install -g grunt-cli

cd /
mkdir /strapling
mkdir /strapling/log
git clone git://github.com/ericvicenti/strapling.git /strapling/strapling 
cd /strapling/strapling
npm install


cd ~

echo "
[program:strapling]
command=/usr/bin/node /strapling/strapling
process_name: strapling
directory=/strapling/
environment=NODE_ENV='prod'
user=root
autostart=true
autorestart=true
redirect_stderr=False
stopwaitsecs=30
stdout_logfile=/strapling/log/stdout.log
stderr_logfile=/strapling/log/stderr.log

" > /etc/supervisor/conf.d/strapling.conf

supervisorctl reread
supervisorctl add strapling
