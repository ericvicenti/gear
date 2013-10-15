var _ = require('./util');

var buildDir = '/root/builds';

var sshConfig = '/root/.ssh/config';

_.ensureDirectorySync(buildDir);

var builder = module.exports = {};

function configureSsh(hostName, host, userName, identityFile) {
  var configure = _.defer();

  var newConfig = '\nHost '+hostName+
                  '\n  HostName '+host+
                  '\n  User '+userName+
                  '\n  IdentityFile '+identityFile+
                  '\n';

  _.fs.readFile(sshConfig, {encoding: 'utf8'}, function(err, existingConfig) {
    if(err) configure.reject(err);
    else _.fs.writeFile(sshConfig, newConfig + existingConfig, {encoding: 'utf8'}, function(err) {
      if(err) configure.reject(err);
      else configure.resolve();
    });
  });
  return configure.promise;
}

function writeKeyfile(deployKeyFile, deployKey) {
  var write = _.defer();
  _.fs.writeFile(deployKeyFile, {encoding: 'utf8'}, function(err) {
    if(err) write.reject(err);
    else write.resolve();
  });
  return write.promise;
}

builder.build = function(b) {
  var build = _.defer();
  var hostName = 'gear-host-'+b.id;
  var deployKeyFile = _.path.join(buildDir, 'deployKey-'+b.id);
  var userHost = b.repoUrl.split(':')[0];
  var repoPath = b.repoUrl.split(':')[1];
  var userName = userHost.split('@')[0];
  var host = userHost.split('@')[1];
  writeKeyfile(deployKeyFile, b.deployKey).then(function() {
    configureSsh(hostName, host, userName, deployKeyFile).then(function() {
      build.resolve();
    }, build.reject);
  }, build.reject);
  // b.id
  // b.refspec
  // b.status

  return build.promise;
}