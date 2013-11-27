/*

WHAT WE NEED:
A. HOSTNAME
B. SIZE
C. REGION

WHAT WE DO:
0. CHECK DNS AVAILABILITY
1. NEW SERVER KEYPAIR
2. UPLOAD KEY
3. CREATE SERVER
4. WAIT FOR IP, WAIT FOR ACTIVE
5. CHECK SSH
5. NEW SERVER ADMIN KEYPAIR
6. DEPLOY SERVER ADMIN KEYS
6. DEPLOY SERVER SETUP SCRIPT
7. RUN SERVER SETUP SCRIPT
0. REMEMBER SERVER
0. DNS POINT TO IP

*/
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


// servers.leaseKeys(ipAddr, user, pkey, newHost).then(function(a) {
//   _.fs.writeFileSync(process.cwd()+'/'+newHost+'.key', a.key, {encoding: 'utf8'});
//   _.fs.writeFileSync(process.cwd()+'/'+newHost+'.crt', a.cert, {encoding: 'utf8'});
//   return doServerSetup(ipAddr, user, pkey);
// }).then(function() {
//   console.log('done!');
// }, function(er) {
//   console.log(er);
// });

doServerSetup(ipAddr, user, pkey).then(function() {
  console.log('done!');
}, function(er) {
  console.log(er);
});



// _.ocean.droplets().then(function(droplets) {
//   console.log('servers! ', droplets);
// }, function() {
//   console.log('ERROR')
// });

// _.ocean.getGlobalImageId(['debian', 'x64', '7.0']).then(function(image) {
//   console.log('Image: '+image);
// }, function(e) {
//   console.log('ERROR', e)
// });

// _.ocean.getSizeId('512mb').then(function(size) {
//   console.log('Size: '+size);
// }, function() {
//   console.log('ERROR')
// });

// _.ocean.getRegionId('nyc2').then(function(region) {
//   console.log('Region: '+region);
// }, function(e) {
//   console.log('ERROR', e);
// });


// _.ocean.createDroplet(name, sizeId, imageId, regionId, sshKeyIds)