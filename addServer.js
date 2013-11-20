var _ = require('./src/util');
var servers = require('./src/client-servers');

var args = process.argv;
var node = args.shift();
var script = args.shift();

var newHost = args.shift();
var ipAddr = args.shift();
var user = args.shift();

ipAddr = ipAddr || newHost;
user = user || 'root';

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

var pKeyFile = getUserHome() + '/.ssh/id_rsa'
var pkey = _.fs.readFileSync(pKeyFile, {encoding: 'utf8'});

servers.leaseKeys(ipAddr, user, pkey, newHost).then(function(a) {
  _.fs.writeFileSync(process.cwd()+'/'+newHost+'.key', a.key, {encoding: 'utf8'});
  _.fs.writeFileSync(process.cwd()+'/'+newHost+'.crt', a.cert, {encoding: 'utf8'});
  console.log('done! ');
}, function(er) {
  console.log(er);
});
