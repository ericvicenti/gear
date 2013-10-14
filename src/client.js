var _ = require('./util');

var db = require('./client-db');

var httpsKey = fs.readFileSync(__dirname + '/asdf.key');
var httpsCert = fs.readFileSync(__dirname + '/asdf.cert');

function makeRequest(opts) {
  var request = _.defer();
  _.request({
    port: opts.port || 8888,
    hostname: opts.hostname || 'localhost',
    path: opts.path || '/',
    method: opts.method || 'GET',
    key: opts.key || httpsKey,
    cert: opts.cert || httpsCert,
    ca: [ opts.cert || httpsCert ],
    rejectUnauthorized: false
  }, function(err, response) {
    if(err) return request.reject(err, response);
    else request.resolve(response);
  });
  return request.promise;
}

var g = module.exports = {};

g.servers = {};

g.servers.add = function(name, host, key, cert) {
}

g.servers.rename = function(name, newName) {

}

g.servers.remove = function(name) {

}

g.apps = {};

g.apps.create = function(name, repoUrl, deployKey) {

}

g.apps.get = function(name) {

}

g.apps.rename = function(name, newName) {

}

g.apps.remove = function(name) {

}

g.builds = {};

g.builds.create = function(serverName, appName, refSpec) {
  var opts = {};
  opts.method = 'POST';
  opts.path = '/builds';

}

g.builds.get = function(buildId) {
  var opts = {};
  opts.path = '/builds/'+buildId;

}

g.builds.remove = function(buildId) {
  var opts = {};
  opts.method = 'DELETE';
  opts.path = '/builds/'+buildId;

}

g.instances = {};

g.instances.set = function(serverName, instanceName, buildId, config) {

}

g.instances.get = function(serverName, instanceName) {

}

g.instances.getConfig = function(serverName, instanceName) {

}

g.instances.setConfig = function(serverName, instanceName, config) {

}

g.instances.setBuild = function(serverName, instanceName, buildId) {

}
g.instances.destroy = function(serverName, instanceName) {
  var destroy = _.defer();
  _.db.getServer(serverName).then(function(server) {
    var opts = {};
    opts.method = 'DELETE';
    opts.path = '/instances/'+instanceName;
    opts.key = server.key;
    opts.cert = server.cert;
    opts.hostname = server.host;
    makeRequest(opts).then(destroy.resolve, destroy.reject);
  }, destroy.reject);
  return destroy.promise;
}