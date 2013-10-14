var express = require('express');

var _ = require('./util');
var app = express();

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.cookieParser());
});

app.get('/', function(req, res) {
  res.send('hello world');
});

var httpsCert = fs.readFileSync('/root/server.key');
var httpsKey = fs.readFileSync('/root/server.crt');

var httpsOpts = {
  key: httpsKey,
  cert: httpsCert,
  ca: [ httpsCert ],
  rejectUnauthorized: true
};

_.https.createServer(httpsOpts, app).listen(8888, function(err) {

  if(err) return console.log('Error! ', err);

  console.log('Server started on 8888');

});