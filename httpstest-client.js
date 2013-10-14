var https = require('https');
var fs = require('fs');

var options = {
  hostname: 'vlad.forgot.his.name',
  port: 8000,
  path: '/',
  method: 'GET',
  key: fs.readFileSync(__dirname + '/server.key'),
  cert: fs.readFileSync(__dirname + '/server.crt'),
  ca: [
    fs.readFileSync(__dirname + '/server.crt')
  ],
  rejectUnauthorized: true
}

var req = https.request(options, function(res) {
  console.log("statusCode: ", res.statusCode);
  console.log("headers: ", res.headers);

  res.on('data', function(d) {
    process.stdout.write(d);
  });
});
req.end();

req.on('error', function(e) {
  console.error(e);
});