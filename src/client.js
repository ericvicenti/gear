var _ = require('./util');

var db = require('./client-db');

var httpsKey = _.fs.readFileSync(_.path.join(__dirname, '../keys/server.key'));
var httpsCert = _.fs.readFileSync(_.path.join(__dirname, '../keys/server.crt'));

function makeRequest(opts) {

  // provide opts path, data, and method
  var request = _.defer();
  var path = opts.path || '/';
  opts = {
    uri: 'https://test.hkr.io:8888' + path,
    body: opts.data ? JSON.stringify(opts.data) : opts.data,
    method: opts.method || 'GET',
    key: opts.key || httpsKey,
    cert: opts.cert || httpsCert,
    ca: [ opts.cert || httpsCert ],
    rejectUnauthorized: true
  };
  _.request(opts, function(err, response) {
    if(err) return request.reject(err, response);
    else request.resolve(response.body);
  });
  return request.promise;
}

function sendServerNameRequest(name, request) {
  var send = _.defer();
  db.servers.get(name).then(function(server) {
    makeRequest(_.extend(request, {
      host: server.host,
      key: server.key,
      cert: server.cert
    })).then(send.resolve, send.reject);
  }, send.reject);
  return send.promise;
}

var g = module.exports = {};

g.start = function() {
  return db.start();
}

g.helloworld = function() {
  return makeRequest({
    hostname: 'test.hkr.io'
  });
}

g.servers = {};

g.servers.list = function() {
  return db.servers.list();
}

g.servers.add = function(name, host, key, cert) {
  return db.servers.add(name, host, key, cert);
}

g.servers.get = function(name) {
  return db.servers.get(name);
}

g.servers.rename = function(name, newName) {
  return db.servers.rename(name, newName);
}

g.servers.remove = function(name) {
  return db.servers.remove(name);
}

g.apps = {};

g.apps.list = function() {
  return db.apps.list();
}

g.apps.add = function(name, repoUrl, deployKey) {
  return db.apps.add(name, repoUrl, deployKey);
}

g.apps.get = function(name) {
  return db.apps.get(name);
}

g.apps.rename = function(name, newName) {
  return db.apps.rename(name, newName);
}

g.apps.remove = function(name) {
  return db.apps.remove(name);
}

g.builds = {};

g.builds.list = function(serverName) {
  return sendServerNameRequest(serverName, {
    path: '/builds',
    method: 'GET'
  });
}

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

g.instances.list = function(serverName) {
  return sendServerNameRequest(serverName, {
    path: '/instances',
    method: 'GET'
  });
}

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