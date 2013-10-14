var _ = require('./util');

var supervisor = module.exports = {};

supervisor.status = function() {
  return _.exec('supervisorctl status');
}

supervisor.reread = function() {
  return _.exec('supervisorctl reread');
}

supervisor.setInstance = function() {

}