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
  var gitDir = _.path.join(buildDir, name);
  var checkout = _.defer();
  var command = 'git checkout '+refspec;
  console.log('running '+command+' at '+gitDir);
  _.exec(command, {
    cwd: gitDir
  }).then(function(a, b, c) {
    console.log('CHECKOUT DONE ', a, b, c);
    checkout.resolve(a, b, c);
  }, function(err) {
    console.log('CHECKOUT ERROR ', err);
    checkout.reject(err);
  });
  return checkout.promise;
}


builder.build = function(b) {
  var build = _.defer();
  b.buildName = 'build-'+b.id;
  b.hostName = 'gear-host-'+b.id;
  var deployKeyFile = _.path.join(buildDir, 'deployKey-'+b.id);
  function _continueBuild() {
    checkoutRefspec(b.buildName, b.refspec).then(function() {
      build.resolve(b);
    }, build.reject);
  }
  if (_.str.include(b.repoUrl, 'https://')) {
    // it look like a repo hosted over https
    // time to forget about that tricky deployKey and user and ssh etc.
    checkoutRepo(b.buildName, b.repoUrl).then(function(a, b, c) {
      _continueBuild();
    }, build.reject);

  } else if (_.str.include(b.repoUrl, '@') && _.str.include(b.repoUrl, ':')) {
    // this is probably a ssh connection. @ and : are our delimters.
    // user@host:path
    var userHost = b.repoUrl.split(':')[0];
    var repoPath = b.repoUrl.split(':')[1];
    var userName = userHost.split('@')[0];
    var host = userHost.split('@')[1];
    writeKeyfile(deployKeyFile, b.deployKey).then(function() {
      configureSsh(hostName, host, userName, deployKeyFile).then(function() {
        checkoutRepo(buildName, hostName+':'+repoPath).then(function(a, b, c) {
          _continueBuild();
        }, build.reject);
      }, build.reject);
    }, build.reject);

  } else build.reject(new Error('Invalid repo URL!'));

  return build.promise;
}