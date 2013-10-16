var _ = require('./util');

var instanceDir = '/root/instances';

_.ensureDirectorySync(instanceDir);


function supervisorInstanceConfigure(instanceId, config) {

}

function supervisorInstanceRestart(instanceId) {
  
}

function supervisorInstanceRemove(instanceId) {

}

function deployBuild(instanceId, buildId) {

}

function deployConfig(instanceId) {

}

function saveConfig(instanceId, config) {

}

function getConfig(instanceId) {

}

function cleanInstance(instanceId) {

}

var instances = module.exports = {};

instances.set = function(instanceId, buildId, config) {
  // saveConfig
  // deployBuild
  // deployConfig
  // supervisorInstanceConfigure
}

instances.setBuild = function(instanceId, buildId) {
  // deployBuild
  // deployConfig
  // supervisorInstanceRestart
}

instances.getConfig = function(instanceId) {
  return getConfig(instanceId);
}

instances.setConfig = function(instanceId, config) {
  // saveConfig
  // deployConfig
  // supervisorInstanceConfigure
}

instances.remove = function(instanceId) {
  // supervisorInstanceRemove
  // cleanInstance
}