var express = require('express');

var _ = require('./util');
var app = express();

var builder = require('./server-builder');
var instances = require('./server-instances');

var db = require('./server-db');

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.cookieParser());
});

function errorCallback(res) {
  return function(err) {
    res.send(500, err);
  }
}

function sendResponse(res, promise) {
  promise.then(function(a) {
    res.send(a);
  }, errorCallback(res));
}


app.get('/', function(req, res) {
  res.send([ 'builds', 'instances' ]);
});

app.post('/builds', function(req, res) {
  var d = req.body;
  var hasErrorHappened = false;
  var hasPassHappened = false;
  var isNotifying = false;
  var afterNotify = false;
  var buildId;
  var lastNotification = null;
  db.builds.add('building', 'Starting Build', d.repoUrl, d.deployKey, d.refspec).then(function(build) {
    buildId = build.id;
    res.send(build);
    builder.build(build).then(function() {
      hasPassHappened = true;
      function reportPass() {
        db.builds.setStatus(buildId, 'passed', 'Build Passed').then(function() {
          console.log('Build '+build.id+' Done.');
        }, function() {
          console.log('Build '+build.id+' Done. Error saving success status');
        });
      }
      if (isNotifying) afterNotify = reportPass;
      else reportPass();
    }, function(err) {
      err = '' + err;
      if(lastNotification) err = lastNotification + ' - ' + err;
      hasErrorHappened = true;
      function reportFailure() {
        db.builds.setStatus(buildId, 'failed', err).then(function() {
          console.log('Build '+build.id+' failed with error: ', err);
        }, function() {
          console.log('Build '+build.id+' failed and could not save error status: ', err);
        });
      }
      if (isNotifying) afterNotify = reportFailure;
      else reportFailure();
    }, function(status) {
      if(status.status == 'commithash') {
        return db.builds.setCommithash(buildId, status.message).then(function() {
          console.log('commithash saved');
        }, function(err) {
          console.log('could not save commit hash ', err);
        });
      }
      if(!hasErrorHappened && !hasPassHappened) {      
        isNotifying = true;
        lastNotification = status.message;
        db.builds.setStatus(buildId, status.status, status.message).then(function() {
          isNotifying = false;
          if(afterNotify) afterNotify();
          afterNotify = false;
        }, function() {
          isNotifying = false;
          if(afterNotify) afterNotify();
          afterNotify = false;
        });
      }
    });
  }, errorCallback(res));
});

app.get('/builds/:id', function(req, res) {
  sendResponse(res, db.builds.get(req.params.id));
});

app.del('/builds/:id', function(req, res) {
  db.builds.get(req.params.id).then(function(build) {
    if(build) {
      builder.remove(req.params.id).then(function() {
        db.builds.remove(req.params.id).then(function() {
          res.send(200, 'Build '+req.params.id+' removed');
        }, function(err) {
          res.send(500, 'Error removing build from db: ', err);
        });
      }, function(err) {
        res.send(500, 'Error removing build:', err);
      });
    } else return res.send(404, 'Could not find build '+req.params.id);
  }, function(err) {
    res.send(404, 'Could not find build '+req.params.id);
  });
});

app.get('/builds', function(req, res) {
  sendResponse(res, db.builds.list());
});

app.get('/instances', function(req, res) {
  db.instances.list().then(function(instances) {
    instances.getStatus().then(function(status) {
      instances = _.map(instances, function(i) {
        var s = status[i.name];
        if(s) i = _.extend(i, s);
        return i;
      });
      res.send(200, instances);
    }, function(err) {
      res.send(500, 'Error getting statuses');
    });
  }, function(err) {
    res.send(500, 'Error fetching instances');
  });
});

app.post('/instances/:name', function(req, res) {
  var i = req.body;
  var instanceName = req.params.name;
  console.log("INSTANCE SET RECIEVED ", instanceName, i)
  db.instances.get(instanceName).then(function(instance) {
    console.log('INSTANCE GET RETRIEVED ', instance)
    if (i.build) {
      db.builds.get(i.build).then(function(build) {
        console.log('BUILD RETRIEVED ', build);
        if(!build) return res.send(400, 'Build ID '+i.build+' not found');
        if (i.config) {
          console.log('SETTING INSTANCE IN DB');
          db.instances.set(instanceName, i.build).then(function(){
            console.log('SETTING INSTANCE');
            sendResponse(res, instances.set(instanceName, i.build, i.config));
          }, function(err) {
            res.send(500, 'Error setting instance in db.');
          });

        } else {
          if(!instance) return res.send(400, 'Must "set" instance '+instanceName+' before changing build');
          console.log('SETTING INSTANCE BUILD');
          instances.setBuild(instanceName, i.build).then(function() {
            console.log('SETTING INSTANCE BUILD IN DB');
            db.instances.set(instanceName, i.build).then(function(){
              res.send(200);
            }, function(err) {
              res.send(500, 'Error setting instance in db.');
            });
          });
        }
      }, function(err) {
        res.send(500, 'Error checking build '+i.build);
      });
    } else if(i.config) {
      if(!instance) return res.send(400, 'Must "set" instance '+instanceName+' before changing config');
      console.log('SETTING INSTANCE CONFIG');
      sendResponse(res, instances.setConfig(instanceName, i.config));        
    } else res.send(400, 'Must send build or configuration to instance');
  }, function(err) {
    res.send(500, 'Error checking instance');
  });
});

app.get('/instances/:name', function(req, res) {
  sendResponse(res, db.instances.get(req.params.name));
});

app.get('/instances/:name/config', function(req, res) {
  sendResponse(res, instances.getConfig(req.params.name));
});

app.del('/instances/:name', function(req, res) {
  db.instances.get(req.params.name).then(function(instance) {
    if(instance) {
      instances.remove(req.params.name).then(function() {
        db.instances.remove(req.params.name).then(function() {
          res.send(200, 'Instance '+req.params.name+' removed');
        }, function(err) {
          res.send(500, 'Error removing instance from db: ', err);
        });
      }, function(err) {
        res.send(500, 'Error removing instance:', err);
      });
    } else return res.send(404, 'Could not find instance '+req.params.name);
  }, function(err) {
    res.send(404, 'Error retrieving instance '+req.params.name);
  });
});


var httpsKey = _.fs.readFileSync('/root/server.key');
var httpsCert = _.fs.readFileSync('/root/server.crt');

var httpsOpts = {
  key: httpsKey,
  cert: httpsCert,
  ca: [ httpsCert ],
  rejectUnauthorized: true
};

db.start().then(function(){

  _.https.createServer(httpsOpts, app).listen(8888, function(err) {

    if(err) return console.log('Error! ', err);

    console.log('Server started on 8888');

  });

}, function(err){
  console.log('Error starting db:', err);
});