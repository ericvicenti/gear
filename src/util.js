var _ = module.exports = require('underscore');

var child_process = require('child_process');

_.path = require('path');
_.https = require('https');
_.fs = require('fs');
_.os = require('os');
_.crypto = require('crypto');
_.Q = require('q');
_.pem = require('pem');
_.str = require('underscore.string');
_.rsync = require("rsyncwrapper").rsync;
_.SSH = require('ssh2');

try {
  _.config = require('../config');  
} catch (e) {
  _.config = require('../config.default');
}

_.mixin({
  ensureDirectorySync: function(dir) {
    // synchronously ensure that a directory exists. only use while setting up the app!
    if(!_.fs.existsSync(dir)) _.fs.mkdirSync(dir);
  },
  defer: function() {
    return _.Q.defer();
  },
  errorPromise: function(err) {
    // takes an error string and returns a promise with that error
    return Q.fcall(function(){
      throw new Error(err);
    });
  },
  withoutEnding: function(string, ending) {
    // if the string has the ending string, cut it off
    if(_.str.endsWith(string, ending)){
      return string.slice(0, -ending.length);
    } else return string;
  },
  getUserHome: function() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  }
});

_.qs = require('querystring');

var request = require('request');
_.request = _.Q.denodeify(request);


_.mixin({

  prepareTempFolder: function() {
    var prepare = _.defer();
    _.crypto.randomBytes(48, function(ex, buf) {
      var token = buf.toString('hex');
      var tempDir = _.os.tmpdir();
      tempDir = _.path.join(tempDir, token);
      _.fs.readdir(tempDir, function(err, files) {
        // if this has no error, the directory is good to go
        // (although it will probably fail because we just invented a new path which doesnt yet exist)
        if (!err) prepare.resolve(tempDir);
        _.fs.mkdir(tempDir, function(err) {
          if (err) prepare.reject(err);
          else prepare.resolve(tempDir);
        });
      });
    });
    return prepare.promise;
  },

  exec: function(command, options) {
    // execute command
    var doExec = _.defer();
    child_process.exec(command, options, function(error, stdout, stderr) {
      if (error) {
        doExec.reject(error);
      } else {
        // console.log('FINISHING EXEC');
        // console.log('ERR:', error, 'STDOUT:', stdout, 'STDERR:', stderr);
        // console.log('/ FINISHING EXEC');
        doExec.resolve(stdout.trim(), stderr.trim());
      }
    });
    return doExec.promise;
  }

});
