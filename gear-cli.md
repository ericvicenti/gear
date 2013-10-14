# Gear Command Line

## Servers

### Add Server

Link a server to manage

`gear add server $SERVER_NAME $SERVER_HOST $SERVER_KEY_FILE `

Eg. `gear add server ui-dev ui-dev.trapit.com ./ui-dev.server.key`

### Rename Server

Change the local name of the server

`gear server $SERVER_NAME rename $NEW_SERVER_NAME`

Eg. `gear server ui-dev rename dev`

### Remove Server

Forget about this server

`gear server $SERVER_NAME remove`

Eg. `gear server congress remove`

## Apps

### Add App

Link an app to manage

`gear add app $APP_NAME $REPO_URL $DEPLOY_KEY_FILE`

Eg. `gear add app storm git@github.com:Trapit/storm ./deploy.key` -> `OK`

### Get App

`gear app $APP_NAME`

Eg. `gear app storm` -> `{name: 'storm', repo_url: 'git@github.com:Trapit/storm' }`

### Rename App

Change the local name of the app

`gear app $APP_NAME rename $NEW_APP_NAME`

Eg. `gear app storm rename ccc` -> `OK`

### Remove App

Forget about this app

`gear app $APP_NAME remove`

Eg. `gear app cms remove` -> `OK`


## Builds

### Create Build

`gear server $SERVER_NAME builds create $APP_NAME $REF_SPEC`

Create a new build.

Eg. `gear server dev builds create ccc social` -> `{id: 123}`

### Get Build

`gear server $SERVER_NAME build $BUILD_ID`

Eg. `gear server dev build 123` -> `{id: 123, status: 'building', etc..}`

## Instances

### Set (Create or Reconfigure) Instance

Set up and configure an instance on the server.

`gear server $SERVER_NAME instance $INSTANCE_NAME set $BUILD_ID $CONFIG_FILE`

Eg. `gear server dev instance ccc-social 123 ~/configs/ccc-social-config.json`

Config files default to the name of the instance. In the following command, the default config file provided would be `./ccc-social.json`

Eg. `gear server dev instance ccc-social 123`


### Build and Set an Instance

An automated way of creating a build and setting it on an instance when the build succeeds.

`gear server $SERVER_NAME instance $INSTANCE_NAME build $APP_NAME $REF_SPEC $CONFIG_FILE`

The config file here defaults to `./ccc-dev.json`

Eg. `gear server dev instance ccc-dev build ccc dev`

### Get Instance

`gear server $SERVER_NAME instance $INSTANCE_NAME`

Eg. `gear server dev instance ccc-social` -> `{status: 'running', etc.. }`

### Get Instance Configuration

`gear server $SERVER_NAME instance $INSTANCE_NAME config`

Eg. `gear server dev instance ccc-social config` -> `{port: etc..}`

### Re-Configure Instance

`gear server $SERVER_NAME instance $INSTANCE_NAME setconfig $CONFIG_FILE`

Eg. `gear server dev instance ccc-social setconfig ./ccc-social-config.json` -> `OK`

Again, the config file parameter can be removed and the default will be `$INSTANCE_NAME.json`.

For example, the following command would default to sending the json config from `./ccc-dev.json`

Eg. `gear server dev instance ccc-dev setconfig` -> `OK`

### Change Instance Build

`gear server $SERVER_NAME instance $INSTANCE_NAME setbuild $BUILD_ID`

Eg. `gear server dev instance ccc-social setbuild 124` -> `OK`

### Delete Instance

Removes an instance from the server by name.

`gear server $SERVER_NAME instance $INSTANCE_NAME destroy`

Eg. `gear server dev instance ccc-social destroy` -> `OK`
