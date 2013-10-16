var _ = module.exports = require('underscore');

var child_process = require('child_process');

_.path = require('path');
_.https = require('https');
_.request = require('request');
_.fs = require('fs');
_.os = require('os');
_.Q = require('q');
_.str = require('underscore.string');

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

_.mixin({

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
