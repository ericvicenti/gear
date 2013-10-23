var fs = require('fs');
var path = require('path');
var pem = require('pem');

var args = process.argv;
var node = args.shift();
var script = args.shift();

var localHostName = args.shift();
var serverHost = args.shift();

var keyFileName = path.join(process.cwd(), serverHost + '.key');
var certFileName = path.join(process.cwd(), serverHost + '.crt');

var rsync = require("rsyncwrapper").rsync;

pem.createCertificate({
  days: 365,
  selfSigned: true,
  commonName: serverHost,
  keyBitsize: 4096
}, function(err, keys){
  if(err) return console.error(err);

  console.log('Keys created! Saving..', keyFileName);
  fs.writeFileSync(keyFileName, keys.serviceKey);
  fs.writeFileSync(certFileName, keys.certificate);

  rsync({
      src: keyFileName,
      dest: localHostName+":/root/server.key"
  }, function (error,stdout,stderr,cmd) {
      if ( error ) {
          // failed
          console.log(error.message);
      } else {
          // success
          console.log('Key Deployed!');
      }
  });

  rsync({
      src: certFileName,
      dest: localHostName+":/root/server.crt"
  },function (error,stdout,stderr,cmd) {
      if ( error ) {
          // failed
          console.log(error.message);
      } else {
          // success
          console.log('Cert Deployed!');
      }
  });


});

