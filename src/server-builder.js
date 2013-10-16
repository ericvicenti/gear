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
  _.exec(command, {
    cwd: buildDir
  }).then(function(stdout, stderr) {
    checkout.resolve(stdout, stderr);
  }, function(err) {
    checkout.reject(err);
  });
  return checkout.promise;
}

function checkoutRefspec(name, refspec) {
  var gitDir = _.path.join(buildDir, name);
  var checkout = _.defer();
  var command = 'git checkout '+refspec;
  _.exec(command, {
    cwd: gitDir
  }).then(function(stdout, stderr) {
    checkout.resolve(stdout, stderr);
  }, function(err) {
    checkout.reject(err);
  });
  return checkout.promise;
}

function npmInstall(name) {
  var install = _.defer();
  var gitDir = _.path.join(buildDir, name);
  var command = '/nvm/v0.10.18/bin/npm install';
  _.exec(command, {
    cwd: gitDir
  }).then(function(stdout, stderr) {
    install.resolve(stdout, stderr);
  }, function(err) {
    install.reject(err);
  });
  return install.promise;
}

function bowerInstall(name) {
  var install = _.defer();
  var gitDir = _.path.join(buildDir, name);
  var command = 'bower install --allow-root';
  _.exec(command, {
    cwd: gitDir
  }).then(function(stdout, stderr) {
    install.resolve(stdout, stderr);
  }, function(err) {
    install.reject(err);
  });
  return install.promise;
}

function gruntBuild(name) {
  var build = _.defer();
  var gitDir = _.path.join(buildDir, name);
  var command = 'grunt build';
  _.exec(command, {
    cwd: gitDir
  }).then(function(stdout, stderr) {
    build.resolve(stdout, stderr);
  }, function(err) {
    build.reject(err);
  });
  return build.promise;
}

function packageBuild(name) {
  var pack = _.defer();
  var gitDir = _.path.join(buildDir, name);
  var tarPath = '/root/builds/'+name+'.tar';
  var command = 'tar -zcvf '+tarPath+' .';
  _.exec(command, {
    cwd: gitDir
  }).then(function(stdout, stderr) {
    pack.resolve(stdout, stderr);
  }, function(err) {
    pack.reject(err);
  });
  return pack.promise;
}

// unpackage:
// tar -xvf /root/builds/mybuild.tar -C /root/instances/myinstance/

function cleanBuild(name) {
  var clean = _.defer();
  var gitDir = _.path.join(buildDir, name);
  var command = 'rm -rf '+gitDir;
  _.exec(command, {
  }).then(function(stdout, stderr) {
    clean.resolve();
  }, function(err) {
    clean.reject(err);
  });
  return clean.promise;
}

function removeBuildPackage(name) {
  var remove = _.defer();
  var tarPath = '/root/builds/'+name+'.tar';
  _.fs.unlink(tarPath, function(err) {
    if (err) remove.resolve(); // pretend to succeed. most common error is the tar doesnt exist
    else remove.resolve();
  });
  return remove.promise;
}

function removeBuild(name) {
  var remove = _.defer();
  removeBuildPackage(name).then(function() {
    cleanBuild(name).then(function() {
      remove.resolve();
    }, remove.reject);
  }, remove.reject);
  return remove.promise;
}

builder.build = function(b) {
  var build = _.defer();
  b.buildName = 'build-'+b.id;
  b.hostName = 'gear-host-'+b.id;
  var deployKeyFile = _.path.join(buildDir, 'deployKey-'+b.id);
  function rejectBuild(err) {
    build.reject.apply(this, arguments);
  }
  function notifyBuild(message) {
    build.notify({ status: 'building', message: message });
  }
  function _continueBuild() {
    notifyBuild('Checking out refspec "'+b.refspec+'"');
    checkoutRefspec(b.buildName, b.refspec).then(function() {
      notifyBuild('Running NPM install');
      npmInstall(b.buildName).then(function() {
        notifyBuild('Running Bower install');
        bowerInstall(b.buildName).then(function() {
          notifyBuild('Running Grunt Build');
          gruntBuild(b.buildName).then(function() {
            notifyBuild('Packaging Build');
            packageBuild(b.buildName).then(function() {
              notifyBuild('Cleaning Build');
              cleanBuild(b.buildName).then(function() {
/* WOAAH */     build.resolve(b);
              }, rejectBuild);
            }, rejectBuild);
          }, rejectBuild);
        }, rejectBuild);
      }, rejectBuild);
    }, rejectBuild);
  }

  notifyBuild('Preparing for build');
  removeBuild(b.buildName).then(function() { // clean the build before starting
    if (_.str.include(b.repoUrl, 'https://')) {
      // it look like a repo hosted over https
      // time to forget about that tricky deployKey and user and ssh etc.
      notifyBuild('Checking out repo '+b.repoUrl);
      checkoutRepo(b.buildName, b.repoUrl).then(function(a, b, c) {
        _continueBuild();
      }, rejectBuild);

    } else if (_.str.include(b.repoUrl, '@') && _.str.include(b.repoUrl, ':')) {
      // this is probably a ssh connection. @ and : are our delimters.
      // user@host:path
      var userHost = b.repoUrl.split(':')[0];
      var repoPath = b.repoUrl.split(':')[1];
      var userName = userHost.split('@')[0];
      var host = userHost.split('@')[1];
      notifyBuild('Saving deployKey for '+userName+' on '+host);
      writeKeyfile(deployKeyFile, b.deployKey).then(function() {
        notifyBuild('Configuring SSH for '+userName+' on '+host);
        configureSsh(hostName, host, userName, deployKeyFile).then(function() {
          notifyBuild('Checking out repo '+repoPath+' on '+host+' as '+userName);
          checkoutRepo(buildName, hostName+':'+repoPath).then(function(a, b, c) {
            _continueBuild();
          }, rejectBuild);
        }, rejectBuild);
      }, rejectBuild);

    } else rejectBuild(new Error('Invalid repo URL!'));
  }, rejectBuild);

  return build.promise;
}

builder.remove = function(buildId) {
  var buildName =  'build-'+buildId;
  return removeBuild(buildName);
}