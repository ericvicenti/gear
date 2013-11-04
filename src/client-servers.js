var _ = require('./util');

var servers = module.exports = {};


function createKeys() {
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

function uploadFile(destHost, destUser, privateKey, destPath, fileData) {
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

// var pkey = _.fs.readFileSync('/Users/ev/.ssh/id_rsa', {encoding: 'utf8'});

// uploadFile('hkr.io', 'root', '/test.txt', pkey, 'hello, server!').then(function() {
//   console.log('done!');
// }, function(er) {
//   console.log(er);
// });

function leaseKeys(serverIp, userName, privateKey, hostName) {
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

    lease.resolve(_.Q.all([
      uploadFile(serverIp, userName, privateKey, '/root/server.crt', leasedCert),
      uploadFile(serverIp, userName, privateKey, '/root/server.key', leasedKey)
    ]));

  });
  return lease.promise;
}


var pkey = _.fs.readFileSync('/Users/ev/.ssh/id_rsa', {encoding: 'utf8'});

leaseKeys('hkr.io', 'root', pkey, 'hkr.io').then(function() {
  console.log('done!');
}, function(er) {
  console.log(er);
});
