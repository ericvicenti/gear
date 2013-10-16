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
  _.fs.writeFile(deployKeyFile, deployKey, {encoding: 'utf8'}, function(err) {
    if(err) write.reject(err);
    else {
      _.fs.chmod(deployKeyFile, '600', function(err) {
        if(err) write.reject(err);
        else write.resolve();
      });
    }
  });
  return write.promise;
}

function checkoutRepo(name, repo) {
  var checkout = _.defer();
  var command = 'git clone '+repo+' '+name;
  console.log('running '+command+' at '+buildDir);
  _.exec(command, {
    cwd: buildDir
  }).then(function(a, b, c) {
    console.log('CHECKOUT DONE ', a, b, c);
    checkout.resolve(a, b, c);
  }, function(err) {
    console.log('CHECKOUT ERROR ', err);
    checkout.reject(err);
  });
  return checkout.promise;
}

function checkoutRefspec(name, refspec) {
  var checkout = _.defer();

  return checkout.promise;
}

builder.build = function(b) {
  var build = _.defer();
  var buildName = 'build-'+b.id;
  var hostName = 'gear-host-'+b.id;
  var deployKeyFile = _.path.join(buildDir, 'deployKey-'+b.id);
  var userHost = b.repoUrl.split(':')[0];
  var repoPath = b.repoUrl.split(':')[1];
  var userName = userHost.split('@')[0];
  var host = userHost.split('@')[1];
  writeKeyfile(deployKeyFile, b.deployKey).then(function() {
    configureSsh(hostName, host, userName, deployKeyFile).then(function() {
      checkoutRepo(buildName, hostName+':'+repoPath).then(function(a, b, c) {
        console.log('output, ', a, b, c)
        console.log('build done!!');
        build.resolve();
      }, build.reject);
    }, build.reject);
  }, build.reject);

  // b.refspec
  // b.status

  return build.promise;
}