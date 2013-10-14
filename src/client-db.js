var _ = require('./util');

var dbLocation = _.path.join(_.getUserHome(), '.geardb');

var sqlite = require('sqlite3');

var _db = new sqlite3.Database(dbLocation);

var db = module.exports = {};