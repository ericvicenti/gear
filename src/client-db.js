var _ = require('./util');

var dbLocation = _.path.join(_.getUserHome(), '.geardb');

var sqlite = require('sqlite3');

var _db = new sqlite.Database(dbLocation);

var db = module.exports = {};

db.start = function() {
  var start = _.defer();
  _db.run("CREATE TABLE IF NOT EXISTS apps ( name TEXT PRIMARY KEY, repoUrl TEXT, deployKey TEXT )", function(err) {
  
    _db.run("CREATE TABLE IF NOT EXISTS servers ( name TEXT PRIMARY KEY, host TEXT, key TEXT, cert TEXT )", function(err) {
      start.resolve();
    });

  });
  return start.promise;
}

db.apps = {};

db.apps.list = function() {
  var list = _.defer();
  _db.all("SELECT * FROM apps", function(err, apps) {
    if(err) return list.reject(err);
    else return list.resolve(apps);
  });
  return list.promise;
}

db.apps.add = function(name, repoUrl, deployKey) {
  var add = _.defer();
  _db.run("INSERT INTO apps (name, repoUrl, deployKey) VALUES (?, ?, ?)", {
    1: name,
    2: repoUrl,
    3: deployKey
  }, function(err) {
    if(err) return add.reject(err);
    else return add.resolve();
  })
  return add.promise;
}

db.apps.get = function(name) {
  var get = _.defer();
  _db.get("SELECT * FROM apps WHERE name = ?", {
    1: name
  }, function(err, item) {
    if(err) return get.reject(err);
    else return get.resolve(item);
  })
  return get.promise; 
}

db.apps.rename = function(name, newName) {
  var rename = _.defer();
  _db.run("UPDATE apps SET name = ? WHERE name = ?", {
    1: newName,
    2: name
  }, function(err) {
    if(err) return rename.reject(err);
    else return rename.resolve();
  });
  return rename.promise;
}

db.apps.remove = function(name) {
  var remove = _.defer();
  _db.run("DELETE FROM apps WHERE name = ?", {
    1: name
  }, function(err) {
    if(err) return remove.reject(err);
    else return remove.resolve();
  });
  return remove.promise;
}

db.servers = {};

db.servers.list = function() {
  var list = _.defer();
  _db.all("SELECT * FROM servers", function(err, servers) {
    if(err) return list.reject(err);
    else return list.resolve(servers);
  });
  return list.promise;
}

db.servers.add = function(name, host, key, cert) {
  var add = _.defer();
  _db.run("INSERT INTO servers (name, host, key, cert) VALUES (?, ?, ?, ?)", {
    1: name,
    2: host,
    3: key,
    4: cert
  }, function(err) {
    if(err) return add.reject(err);
    else return add.resolve();
  })
  return add.promise;
}

db.servers.get = function(name) {
  var get = _.defer();
  _db.get("SELECT * FROM servers WHERE name = ?", {
    1: name
  }, function(err, item) {
    if(err) return get.reject(err);
    else return get.resolve(item);
  })
  return get.promise;
}

db.servers.rename = function(name, newName) {
  var rename = _.defer();
  _db.run("UPDATE servers SET name = ? WHERE name = ?", {
    1: newName,
    2: name
  }, function(err) {
    if(err) return rename.reject(err);
    else return rename.resolve();
  });
  return rename.promise;
}

db.servers.remove = function(name) {
  var remove = _.defer();
  _db.run("DELETE FROM servers WHERE name = ?", {
    1: name
  }, function(err) {
    if(err) return remove.reject(err);
    else return remove.resolve();
  });
  return remove.promise;
}