var express = require('express');

var _ = require('./util');
var app = express();

var db = require('./server-db');

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.cookieParser());
});

function sendResponse(res, promise) {
  promise.then(function(a) {
    res.send(a);
  }, function(err) {
    res.send(500, err);
  });
}

app.get('/', function(req, res) {
  res.send('hello world');
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