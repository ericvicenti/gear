var _ = require('./util');

var servers = module.exports = {};


servers.createKeys = function createKeys() {
  var create = _.defer();
  _.pem.createPrivateKey(2048, function(err, out) {
    if(err) return create.reject(err);
    var privateKey = out.key;
    _.pem.getPublicKey(privateKey, function(err, out) {
      if(err) return create.reject(err);
      var publicKey = out.publicKey;
      create.resolve({
        publicKey: publicKey,
        privateKey: privateKey
      });
    })
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