var _ = require('./util');

var dbLocation = _.path.join(_.getUserHome(), '.geardb');

var sqlite = require('sqlite3');

var _db = new sqlite.Database(dbLocation);

var db = module.exports = {};

db.start = function() {
  var start = _.defer();
  _db.run("CREATE TABLE IF NOT EXISTS builds ( id INT PRIMARY KEY, status TEXT, repoUrl TEXT, deployKey TEXT, refspec TEXT )", function(err) {
    if(err) return start.reject(err);
    _db.run("CREATE TABLE IF NOT EXISTS instances ( name TEXT PRIMARY KEY, build INT, FOREIGN KEY(build) REFERENCES builds(id) )", function(err) {
      if(err) return start.reject(err);
      start.resolve();
    });
  });
  return start.promise;
}

db.builds = {};

db.builds.list = function() {
  var list = _.defer();
  _db.all("SELECT * FROM builds", function(err, builds) {
    if(err) return list.reject(err);
    else return list.resolve(builds);
  });
  return list.promise;
}

db.builds.add = function(status, repoUrl, deployKey, refspec) {
  var add = _.defer();
  _db.run("INSERT INTO builds (id, status, repoUrl, deployKey, refspec) VALUES (?, ?, ?, ?)", {
    1: null,
    2: status,
    3: repoUrl,
    4: deployKey,
    5: refspec
  }, function(err) {
    if(err) return add.reject(err);
    else return add.resolve();
  })
  return add.promise;
}

db.builds.get = function(id) {
  var get = _.defer();
  _db.get("SELECT * FROM builds WHERE id LIKE ?", {
    1: id
  }, function(err, item) {
    if(err) return get.reject(err);
    else return get.resolve(item);
  })
  return get.promise; 
}

db.builds.remove = function(id) {
  var remove = _.defer();
  _db.run("DELETE FROM builds WHERE id LIKE ?", {
    1: id
  }, function(err) {
    if(err) return remove.reject(err);
    else return remove.resolve();
  });
  return remove.promise;
}

db.instances = {};

db.instances.list = function() {
  var list = _.defer();
  _db.all("SELECT * FROM instances", function(err, instances) {
    if(err) return list.reject(err);
    else return list.resolve(instances);
  });
  return list.promise;
}

db.instances.set = function(name, build) {
  var add = _.defer();
  _db.run("INSERT OR IGNORE INTO instances (name) VALUES (?)", {
    1: name
  }, function(err) {
    if(err) return add.reject(err);
    _db.run("UPDATE instances SET build = ? WHERE name LIKE ? ", {
      1: build,
      2: name
    }, function(err) {
      if(err) return add.reject(err);
      else return add.resolve();
    });
  });
  return add.promise;
}

db.instances.get = function(name) {
  var get = _.defer();
  _db.get("SELECT * FROM instances WHERE name LIKE ?", {
    1: name
  }, function(err, item) {
    if(err) return get.reject(err);
    else return get.resolve(item);
  });
  return get.promise;
}

db.instances.remove = function(name) {
  var remove = _.defer();
  _db.run("DELETE FROM instances WHERE name LIKE ?", {
    1: name
  }, function(err) {
    if(err) return remove.reject(err);
    else return remove.resolve();
  });
  return remove.promise;
}