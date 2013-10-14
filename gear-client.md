# Gear Client



## Servers


### gear.servers.add = function(name, host, key, cert) {}


### gear.servers.rename = function(name, newName) {


### gear.servers.remove = function(name) {





## Apps


### gear.apps.create = function(name, repoUrl, deployKey) {


### gear.apps.get = function(name) {


### gear.apps.rename = function(name, newName) {


### gear.apps.remove = function(name) {





## Builds


### gear.builds.create = function(serverName, appName, refSpec) {


### gear.builds.get = function(buildId) {


### gear.builds.remove = function(buildId) {





## Instances


### gear.instances.set = function(serverName, instanceName, buildId, config) {


### gear.instances.get = function(serverName, instanceName) {


### gear.instances.getConfig = function(serverName, instanceName) {


### gear.instances.setConfig = function(serverName, instanceName, config) {


### gear.instances.setBuild = function(serverName, instanceName, buildId) {


### gear.instances.destroy = function(serverName, instanceName) {