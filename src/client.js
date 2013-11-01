var _ = require('./util');

var db = require('./client-db');

var httpsKeyFile = _.path.join(__dirname, '../keys/server.key');
var httpsKey = _.fs.existsSync(httpsKeyFile) ? _.fs.readFileSync(httpsKeyFile) : undefined;
var httpsCertFile = _.path.join(__dirname, '../keys/server.crt');
var httpsCert = _.fs.existsSync(httpsCertFile) ? _.fs.readFileSync(httpsCertFile) : undefined;

function makeRequest(opts) {

  // provide opts path, data, and method
  var request = _.defer();
  var path = opts.path || '/';
  var uri = 'https://' + opts.host + ':8888' + path;
  opts = {
    uri: uri,
    json: opts.data,
    method: opts.method || 'GET',
    key: opts.key || httpsKey,
    cert: opts.cert || httpsCert,
    ca: [ opts.cert || httpsCert ],
    rejectUnauthorized: true
  };
  _.request(opts, function(err, response) {
    if(err) return request.reject(err, response);
    else {
      var body = response.body;
      try {
        body = JSON.parse(body);
      } catch(e) {}
      request.resolve(body);
    }
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
  var opts = {};
  opts.path = '/builds';
  return sendServerNameRequest(serverName, opts);
}

g.builds.create = function(serverName, appName, refspec) {
  var create = _.defer();
  db.apps.get(appName).then(function(app) {
    var opts = {};
    opts.method = 'POST';
    opts.path = '/builds';
    opts.data = {
      refspec: refspec,
      repoUrl: app.repoUrl,
      deployKey: app.deployKey
    }
    sendServerNameRequest(serverName, opts).then(create.resolve, create.reject);
  }, create.reject);
  return create.promise;
}

g.builds.build = function(serverName, appName, refspec) {
  var doBuild = _.defer();
  var buildId, statusMessage, status;
  function checkStatus() {
    g.builds.get(serverName, buildId).then(function(build) {
      if(build.statusMsg !== statusMessage) {
        status = build.status;
        statusMessage = build.statusMsg;
        doBuild.notify(statusMessage);
      }
      if (build.status == 'passed') {
        doBuild.resolve(build);
      } else if(build.status == 'failed') {
        doBuild.reject(statusMessage);
      } else {
        setTimeout(checkStatus, 1000);
      }
    }, doBuild.reject);
  }
  g.builds.create(serverName, appName, refspec).then(function(build) {
    buildId = build.id;
    statusMessage = build.statusMsg;
    status = build.status;
    checkStatus();
  }, doBuild.reject);
  return doBuild.promise;
}

g.builds.get = function(serverName, buildId) {
  var opts = {};
  opts.path = '/builds/'+buildId;
  return sendServerNameRequest(serverName, opts);
}

g.builds.remove = function(serverName, buildId) {
  var opts = {};
  opts.method = 'DELETE';
  opts.path = '/builds/'+buildId;
  return sendServerNameRequest(serverName, opts);
}

g.instances = {};

g.instances.list = function(serverName) {
  var opts = {};
  opts.path = '/instances';
  return sendServerNameRequest(serverName, opts);
}

g.instances.set = function(serverName, instanceName, buildId, config) {
  var opts = {};
  opts.method = 'POST';
  opts.path = '/instances/'+instanceName;
  opts.data = {
    build: buildId,
    config: config
  }
  return sendServerNameRequest(serverName, opts);
}

g.instances.build = function(serverName, instanceName, appName, refspec, config) {
  var doBuild = _.defer();
  g.builds.build(serverName, appName, refspec).then(function(build) {
    if(config) g.instances.set(serverName, instanceName, build.id, config).then(doBuild.resolve, doBuild.reject);
    else g.instances.setBuild(serverName, instanceName, build.id).then(function() {
      doBuild.resolve(build);
    }, doBuild.reject);
  }, doBuild.reject, doBuild.notify);
  return doBuild.promise;
}

g.instances.get = function(serverName, instanceName) {
  var opts = {};
  opts.path = '/instances/'+instanceName;
  return sendServerNameRequest(serverName, opts);
}

g.instances.getConfig = function(serverName, instanceName) {
  var opts = {};
  opts.path = '/instances/'+instanceName+'/config';
  return sendServerNameRequest(serverName, opts);
}

g.instances.setConfig = function(serverName, instanceName, config) {
  var opts = {};
  opts.method = 'POST';
  opts.path = '/instances/'+instanceName;
  opts.data = { config: config };
  return sendServerNameRequest(serverName, opts);
}

g.instances.setBuild = function(serverName, instanceName, buildId) {
  var opts = {};
  opts.method = 'POST';
  opts.path = '/instances/'+instanceName;
  opts.data = { build: buildId };
  return sendServerNameRequest(serverName, opts);
}

g.instances.destroy = function(serverName, instanceName) {
  var opts = {};
  opts.method = 'DELETE';
  opts.path = '/instances/'+instanceName;
  return sendServerNameRequest(serverName, opts);
}
