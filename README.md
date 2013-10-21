# Gear

Easy deployment system for Node.js apps

## Gear Components

### Gear Server

The server is the app which runs on the server being managed. It offers an https rest server as a management interface for the client.

### Gear Client

Node.js api running on the machine(s) which manages the server(s).

### Gear CLI

A simple command-line app wrapping gear-client. See the [documentation](gear-cli.md).


## Setup and Usage


### Gear Server Setup

1. Get a fresh server with Debian 7.0 x64
2. Set up DNS to point to that server (ie. ui-dev.trapit.com -> IP_ADDRESS)
2. Create a key: `ssh-keygen -t rsa -b 4096 -f ./new-server.key -P '' -C ''`
1. Log in to the server as root
2. Save the public key file in `/root/authorized_access.pub`
2. Run `curl https://raw.github.com/ericvicenti/gear/master/setup.sh | bash`
 * Update Server
 * Get tools to build node
 * Use NVM to install node & npm
 * Install node build tools (grunt & bower)
 * Install Supervisor
 * Check out the gear server app
 * Configure Supervisor to run the gear server

## License

[The MIT License](LICENSE.md)

Copyright (c) 2013 Trapit Inc.