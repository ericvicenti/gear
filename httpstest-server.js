var express = require('express');
var https = require('https');
var http = require('http');
var fs = require('fs');

var httpsOpts = {
  key: fs.readFileSync(__dirname + '/asdf.key'),
  cert: fs.readFileSync(__dirname + '/asdf.crt'),
  ca: [
    fs.readFileSync(__dirname + '/asdf.crt')
  ],
  rejectUnauthorized: true
};

var app = express();

app.get('/', function(req, res){
  res.send('hello, security!');
});

https.createServer(httpsOpts, app).listen(8090);