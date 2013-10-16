var express = require('express');

var _ = require('./util');
var app = express();

var builder = require('./server-builder');

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
  res.send('hello world');
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
      console.log('PROMISE RESOLVED');
      hasPassHappened = true;
      function reportPass() {
        db.builds.setStatus(buildId, 'passed', 'Build Passed').then(function() {
          console.log('saved success status');
        }, function() {
          console.log('error saving success status');
        });
      }
      if (isNotifying) afterNotify = reportPass;
      else reportPass();
    }, function(err) {
      err = '' + err;
      if(lastNotification) err = lastNotification + ' - ' + err;
      console.log('PROMISE REJECT ', err);
      hasErrorHappened = true;
      function reportFailure() {
        db.builds.setStatus(buildId, 'failed', err).then(function() {
          console.log('saved err status ', err);
        }, function() {
          console.log('error saving err status');
        });
      }
      if (isNotifying) afterNotify = reportFailure;
      else reportFailure();
    }, function(status) {
      console.log('PROMISE NOTIFY ', status);
      if(!hasErrorHappened && !hasPassHappened) {      
        isNotifying = true;
        lastNotification = status.message;
        db.builds.setStatus(buildId, status.status, status.message).then(function() {
          isNotifying = false;
          if(afterNotify) afterNotify();
          afterNotify = false;
          console.log('saved status ', status.message);
        }, function() {
          isNotifying = false;
          if(afterNotify) afterNotify();
          afterNotify = false;
          console.log('error saving status');
        });
      }
    });
  }, errorCallback(res));
});

app.get('/builds/:id', function(req, res) {
  sendResponse(res, db.builds.get(req.params.id));
});

app.del('/builds/:id', function(req, res) {
  sendResponse(res, db.builds.remove(req.params.id));
});

app.get('/builds', function(req, res) {
  sendResponse(res, db.builds.list());
});

app.get('/instances', function(req, res) {
  sendResponse(res, db.instances.list());
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