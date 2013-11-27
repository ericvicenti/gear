var _ = require('./util');

var servers = module.exports = {};

var keygen = require('ssh-keygen');

servers.createKeys = function createKeys() {
  var create = _.defer();
  keygen({
    destroy: true
  }, function(err, out){
      if(err) return create.reject()
      else create.resolve({
        publicKey: out.pubKey,
        privateKey: out.key
      });
  });
  return create.promise;  
}


servers.uploadFile = function uploadFile(destHost, destUser, privateKey, destPath, fileData) {
  var upload = _.defer();
  _.prepareTempFolder().then(function(tempDir) {
    var keyFileName = _.path.join(tempDir, 'private.key');
    var sourceFileName = _.path.join(tempDir, 'source.file');
    _.fs.writeFile(keyFileName, privateKey, function(err) {
      if (err) return upload.reject(err);
      _.fs.writeFile(sourceFileName, fileData, function(err) {
        if (err) return upload.reject(err);
        _.rsync({
          ssh: true,
          src: sourceFileName,
          privateKey: keyFileName,
          dest: destUser + '@' + destHost + ':' + destPath
        }, function (error, stdout, stderr, cmd) {
          console.log(cmd);
          if (error) {
            upload.reject(error.message);
          } else {
            upload.resolve();
          }
        });
      });
    });
  }, upload.reject);
  return upload.promise;  
}

servers.leaseKeys = function leaseKeys(serverIp, userName, privateKey, hostName) {
  var lease = _.defer();
  _.pem.createCertificate({
    days: 365,
    selfSigned: true,
    commonName: hostName,
    keyBitsize: 4096
  }, function(err, keys){
    if(err) return lease.reject(err);
    var leasedKey = keys.serviceKey;
    var leasedCert = keys.certificate;
    var doUploadFiles = _.Q.all([
      servers.uploadFile(serverIp, userName, privateKey, '/root/server.crt', leasedCert),
      servers.uploadFile(serverIp, userName, privateKey, '/root/server.key', leasedKey)
    ]);
    lease.resolve(doUploadFiles.then(function() {
      return {
        key: leasedKey,
        cert: leasedCert
      }
    }));

  });
  return lease.promise;
}


var DigitalOceanAPI = require('digitalocean-api');

doApi = new DigitalOceanAPI(_.config.digitalOcean.clientId, _.config.digitalOcean.apiKey);


servers.droplets = _.Q.nbind(doApi.dropletGetAll, doApi);
servers.dropletGet = _.Q.nbind(doApi.dropletGet, doApi);
servers.dropletNew = _.Q.nbind(doApi.dropletNew, doApi);

servers.waitForActive = function(server, limit) {
  var wait = _.defer();
  servers.dropletGet(server.id).then(function(s) {
    if (s.status == 'active') wait.resolve(_.extend(server, s));
    else if (limit <= 0) wait.reject(new Error('Could not wait for active'));
    else {
      setTimeout(function() {
        wait.resolve(servers.waitForActive(server, limit-1));
      }, 3000);
    }
  });
  return wait.promise;
}

servers.waitForSSH = function(server, limit) {
  var wait = _.defer();
  servers.uptime(server).then(function(uptime) {
    server.uptime = uptime;
    wait.resolve(server);
  }, function() {
    if (limit <= 0) wait.reject(new Error('Could not wait for active'));
    else {
      setTimeout(function() {
        wait.resolve(servers.waitForSSH(server, limit-1));
      }, 3000);
    }
  });
  return wait.promise;
}

servers.createServer = function() {
  return servers.dropletNew.apply(this, arguments).then(function(server) {
    console.log('server made')
    return servers.waitForActive(server, 20).then(function(server) {
      console.log('server active')
      return server;
    });
  });
}

servers.images = _.Q.nbind(doApi.imageGetAll, doApi);
servers.myImages = _.Q.nbind(doApi.imageGetMine, doApi);
servers.globalImages = _.Q.nbind(doApi.imageGetGlobal, doApi);

servers.regions = _.Q.nbind(doApi.regionGetAll, doApi);

servers.sizes = _.Q.nbind(doApi.sizeGetAll, doApi);

servers.sshKeyGetAll = _.Q.nbind(doApi.sshKeyGetAll, doApi);
servers.sshKeyGet = _.Q.nbind(doApi.sshKeyGet, doApi);
servers.sshKeyAdd = _.Q.nbind(doApi.sshKeyAdd, doApi);
servers.sshKeyEdit = _.Q.nbind(doApi.sshKeyEdit, doApi);
servers.sshKeyDestroy = _.Q.nbind(doApi.sshKeyDestroy, doApi);


function itemFilter(items, attr, str) {
  return _.filter(items, function(item) {
    var name = item[attr].toLowerCase();
    str = str.toLowerCase();
    return _.str.include(name, str);
  });
}

servers.getRegionId = function(names) {
  if (!_.isArray(names)) names = [names];
  return servers.regions().then(function(regions) {
    _.each(names, function(name) {
      regions = itemFilter(regions, 'slug', name);
    })
    return regions[0].id;
  });
}

servers.getSizeId = function(names) {
  if (!_.isArray(names)) names = [names];
  return servers.sizes().then(function(sizes) {
    _.each(names, function(name) {
      sizes = itemFilter(sizes, 'name', name);
    })
    return sizes[0].id;
  });
}

servers.getGlobalImageId = function(names) {
  if (!_.isArray(names)) names = [names];
  return servers.globalImages().then(function(images) {
    _.each(names, function(name) {
      images = itemFilter(images, 'name', name);
    });
    return images[0].id;
  });
}

servers.create = function(name) {
  return servers.createKeys().then(function(serverKeys) {
    return servers.sshKeyAdd('key-'+name, serverKeys.publicKey).then(function(key) {
      return servers.getRegionId('nyc2').then(function(regionId) {
        return servers.getSizeId('512mb').then(function(sizeId) {
          return servers.getGlobalImageId(['debian','x64','7.0']).then(function(imageId) {
            return servers.createServer(name, sizeId, imageId, regionId, [key.id]).then(function(server) {
              server.privateKey = serverKeys.privateKey;
              server.publicKey = serverKeys.publicKey;
              console.log('got server', server);
              return servers.waitForSSH(server, 5).then(function(server) {
                console.log('asdf')
                return server;
              });
            });
          });
        });
      });
    });
  });
}

servers.uptime = function(server) {
  var run = _.defer();
  var c = new _.SSH();
  var uptimeData = '';
  c.on('connect', function() {
    console.log('Connection :: connect');
  });
  c.on('ready', function() {
    console.log('Connection :: ready');
    c.exec('uptime', function(err, stream) {
      if (err) throw err;
      stream.on('data', function(data, extended) {
        if (extended === 'stderr' ) { // stderr
          console.log('Data :: stderr :: '+data);
        } else { // stdout
          uptimeData += data;
        }
      });
      stream.on('end', function() {
        console.log('Stream :: EOF');
      });
      stream.on('close', function() {
        console.log('Stream :: close');
      });
      stream.on('exit', function(code, signal) {
        console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
        c.end();
      });
    });
  });
  c.on('error', function(err) {
    console.log('Connection :: error :: ' + err);
  });
  c.on('end', function() {
    console.log('Connection :: end');
  });
  c.on('close', function(had_error) {
    console.log('Connection :: close');
    run.resolve(uptimeData);
  });
  c.connect({
    host: server.ip_address,
    port: 22,
    username: 'root',
    privateKey: server.privateKey
  });
  return run.promise;
}

var SETUP_COMMAND = 'curl https://raw.github.com/ericvicenti/gear/master/setup.sh | bash';

servers.doServerSetup = function(ipAddr, user, pkey, port) {
  port == port || 22;
  var doSetup = _.defer();
  var c = new _.SSH();
  c.on('connect', function() {
    console.log('Connection :: connect');
  });
  c.on('ready', function() {
    console.log('Connection :: ready');
    c.exec(SETUP_COMMAND, function(err, stream) {
      if (err) throw err;
      stream.on('data', function(data, extended) {
        console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
      });
      stream.on('end', function() {
        console.log('Stream :: EOF');
      });
      stream.on('close', function() {
        console.log('Stream :: close');
      });
      stream.on('exit', function(code, signal) {
        console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
        c.end();
      });
    });
  });
  c.on('error', function(err) {
    console.log('Connection :: error :: ' + err);
  });
  c.on('end', function() {
    console.log('Connection :: end');
  });
  c.on('close', function(had_error) {
    console.log('Connection :: close');
    doSetup.resolve();
  });
  c.connect({
    host: ipAddr,
    port: port,
    username: user,
    privateKey: pkey
  });
  return doSetup.promise;
}
