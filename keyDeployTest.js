var fs = require('fs');
var pem = require('pem');

var keyFileName = __dirname + '/server.key';
var certFileName = __dirname + '/server.crt';

var rsync = require("rsyncwrapper").rsync;

pem.createCertificate({
  days: 1,
  selfSigned: true,
  commonName: 'vlad.forgot.his.name',
  keyBitsize: 4096
}, function(err, keys){
  if(err) return console.error(err);
  fs.writeFileSync(keyFileName, keys.serviceKey);
  fs.writeFileSync(certFileName, keys.certificate);

  rsync({
      src: keyFileName,
      dest: "vlad:/home/ev/node_tests/https/test.key"
  },function (error,stdout,stderr,cmd) {
      if ( error ) {
          // failed
          console.log(error.message);
      } else {
          // success
          console.log('woot woot');
      }
  });

});

