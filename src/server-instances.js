var _ = require('./util');

var baseInstanceDir = '/root/instances';
var baseConfigDir = '/root/configs';
var baseLogDir = '/root/logs';
var baseSupervisorConfigDir = '/etc/supervisor/conf.d';

_.ensureDirectorySync(baseInstanceDir);
_.ensureDirectorySync(baseConfigDir);
_.ensureDirectorySync(baseLogDir);

function getInstanceDir(instanceId) {
  return _.path.join(baseInstanceDir, instanceId);
}

function getInstanceConfigFile(instanceId) {
  return _.path.join(baseConfigDir, instanceId+'.json');
}

function getInstanceSupervisorConfigFile(instanceId) {
  return _.path.join(baseSupervisorConfigDir, 'instance-'+instanceId+'.conf');
}

function getInstanceLogFile(instanceId) {
  return _.path.join(baseLogDir, 'instance-'+instanceId+'.log');
}

function getSupervisorConfig(instanceId, config) {
  var get = _.defer();
  _.fs.readFile(__dirname+'/../templates/instance.conf', {encoding: 'utf8'}, function(err, template) {
    if(err) return get.reject(err);
    template = _.template(template);
    var config = template({
      id: instanceId,
      dir: getInstanceDir(instanceId),
      logFile: getInstanceLogFile(instanceId)
    });
    get.resolve(config);
  });
  return get.promise;
}

function supervisorInstanceConfigure(instanceId, config) {
  var configure = _.defer();
  getSupervisorConfig(instanceId, config).then(function(configStr) {
    var configFile = getInstanceSupervisorConfigFile(instanceId);
    _.fs.writeFile(configFile, configStr, {encoding: 'utf8'}, function(err) {
      if(err) configure.reject(err);
      else {
        supervisorUpdate().then(configure.resolve, configure.reject);
      }
    });
  }, configure.reject);
  return configure.promise;
}

function supervisorInstanceRestart(instanceId) {
  var supervisorctl = _.defer();
  var command = 'supervisorctl restart '+instanceId;
  _.exec(command, {
  }).then(function(stdout, stderr) {
    supervisorctl.resolve();
  }, function(err) {
    supervisorctl.reject(err);
  });
  return supervisorctl.promise;
}

function supervisorUpdate() {
  var supervisorctl = _.defer();
  var command = 'supervisorctl update';
  _.exec(command, {
  }).then(function(stdout, stderr) {
    supervisorctl.resolve();
  }, function(err) {
    supervisorctl.reject(err);
  });
  return supervisorctl.promise;
}

function supervisorInstanceRemove(instanceId) {
  var remove = _.defer();
  var configFile = getInstanceConfigFile(instanceId);
  _.fs.remove(configFile, function(err) {
    if(err) remove.reject(err);
    else {
      supervisorUpdate().then(remove.resolve, remove.reject);
    }
  });
  return remove.promise;
}

function deployBuild(instanceId, buildId) {
  var deploy = _.defer();
  var tarPath = '/root/builds/build-'+buildId+'.tar';
  var destPath = getInstanceDir(instanceId);
  cleanInstance(instanceId).then(function() {
    _.fs.mkdir(destPath, function(err) {
      var command = 'tar -xf '+tarPath+' -C '+destPath+'/';
      _.exec(command, {
      }).then(function(stdout, stderr) {
        deploy.resolve();
      }, function(err) {
        deploy.reject(err);
      });
    });
  }, deploy.reject);
  return deploy.promise;
}

function deployConfig(instanceId) {
  var deploy = _.defer();
  var destFile = _.path.join(getInstanceDir(instanceId), 'config.js');
  getConfig(instanceId).then(function(config) {
    var destFileData = 'module.exports = '+JSON.stringify(config)+';';
    _.fs.writeFile(destFile, destFileData, {encoding: 'utf8'}, function(err) {
      if (err) deploy.reject(err);
      else deploy.resolve();
    });
  }, deploy.reject);
  return deploy.promise;
}

function saveConfig(instanceId, config) {
  var save = _.defer();
  var configFile = getInstanceConfigFile(instanceId);
  var configStr = JSON.stringify(config);
  _.fs.writeFile(configFile, configStr, {encoding: 'utf8'}, function(err) {
    if (err) save.reject(err);
    else save.resolve();
  });
  return save.promise;
}

function getConfig(instanceId) {
  var get = _.defer();
  var configFile = getInstanceConfigFile(instanceId);
  _.fs.readFile(configFile, {encoding: 'utf8'}, function(err, configData) {
    if (err) get.reject(err);
    else {
      var config = JSON.parse(configData);
      get.resolve(config);
    }
  });
  return get.promise;
}

function cleanInstance(instanceId) {
  var clean = _.defer();
  var instanceDir = getInstanceDir(instanceId);
  var command = 'rm -rf '+instanceDir;
  _.exec(command, {
  }).then(function(stdout, stderr) {
    clean.resolve();
  }, function(err) {
    clean.reject(err);
  });
  return clean.promise;
}

var instances = module.exports = {};

instances.set = function(instanceId, buildId, config) {
  var set = _.defer();
  console.log('SETTING CONFIG ', instanceId, config);
  saveConfig(instanceId, config).then(function() {
    console.log('BUILD DEPLOY ', buildId);
    deployBuild(instanceId, buildId).then(function() {
      console.log('CONFIG DEPLOY ', instanceId);
      deployConfig(instanceId).then(function() {
        console.log('SUPERVISOR CONFIG ', instanceId, config);
        supervisorInstanceConfigure(instanceId, config).then(function() {
          console.log('DONE SETTING')
          set.resolve();
        }, set.reject);
      }, set.reject);
    }, set.reject);
  }, set.reject);
  return set.promise;
}

instances.setBuild = function(instanceId, buildId) {
  var set = _.defer();
  deployBuild(instanceId, buildId).then(function() {
    deployConfig(instanceId).then(function() {
      supervisorInstanceRestart(instanceId).then(function() {
        set.resolve();
      }, set.reject);
    }, set.reject);
  }, set.reject);
  return set.promise;
}

instances.getConfig = function(instanceId) {
  return getConfig(instanceId);
}

instances.setConfig = function(instanceId, config) {
  console.log('SAVING CONFIG ', instanceId, config);
  var set = _.defer();
  saveConfig(instanceId, config).then(function() {
    console.log('DEPLOYING CONFIG ');

    deployConfig(instanceId).then(function() {
      console.log('CONFIGURING INSTANCE');

      supervisorInstanceConfigure(instanceId, config).then(function() {
        console.log('DONE');

        set.resolve();
      }, set.reject);
    }, set.reject);
  }, set.reject);
  return set.promise;
}

instances.remove = function(instanceId) {
  var remove = _.defer();
  supervisorInstanceRemove(instanceId).then(function() {
    cleanInstance(instanceId).then(function() {
      remove.resolve();
    }, remove.reject);
  }, remove.reject);
  return remove.promise;
}
