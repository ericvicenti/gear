var _ = require('./util');

var client = require('./client');


var args = process.argv;
var node = args.shift();
var script = args.shift();
var command = args.shift();

function cliErrorHandler(err) {
  console.log('ERROR');
  console.log(err);
}

function cliResponse(promise) {
  promise.then(function(a) {
    if(_.isUndefined(a)) return console.log('Done!');
    console.log.apply(this, arguments);
  }, cliErrorHandler, function(status) {
    console.log('STATUS: ', status);
  });
}


client.start().then(function() {

  switch (command) {
    case 'add':
      command = args.shift();
      if(!command) throw new Error('Must specify what to add');
      switch (command) {
        case 'app':
          var name = args.shift();
          var repoUrl = args.shift();
          var deployKey = args.shift();
          if (deployKey && _.fs.existsSync(deployKey))
            deployKey = _.fs.readFileSync(deployKey, {encoding: 'utf8'});
          return cliResponse(client.apps.add(name, repoUrl, deployKey));
        case 'server':
          var name = args.shift();
          var host = args.shift();
          var key = args.shift();
          var cert = args.shift();
          if(!key) key = './'+name+'.key';
          if(!cert) cert = './'+name+'.crt';
          key = _.fs.readFileSync(key, {encoding: 'utf8'});
          cert = _.fs.readFileSync(cert, {encoding: 'utf8'});
          return cliResponse(client.servers.add(name, host, key, cert));
        default:
          throw new Error('Cannot add "'+command+'" here');
      }
    case 'server':
    case 'servers':
      serverName = args.shift();
      if(!serverName) return cliResponse(client.servers.list());
      return client.servers.get(serverName).then(function(server) {
        // in the case of a "404", send them a list
        if(!server) return cliResponse(client.servers.list());
        else {
          command = args.shift();
          if(!command) console.log(server);
          switch (command) {
            case 'rename':
              var newName = args.shift();
              return cliResponse(client.servers.rename(serverName, newName));
            case 'remove':
              return cliResponse(client.servers.remove(serverName));
            case 'create':
              var type = args.shift();
              if(!type) throw new Error('Must specify what to add to this server');
              switch (type) {
                case 'build':
                  var appName = args.shift();
                  var refspec = args.shift();
                  return cliResponse(client.builds.create(serverName, appName, refspec));
                default:
                  throw new Error('Cannot add "'+type+'" to this server');
              }
            case 'builds':
            case 'build':
              var id = args.shift();
              if(!id) return cliResponse(client.builds.list(serverName));
              else return client.builds.get(serverName, id).then(function(build) {
                command = args.shift();
                if(!command) console.log(build);
                switch (command) {
                  case 'remove':
                    return cliResponse(client.builds.remove(serverName, id));
                  default:
                    throw new Error('Cannot run "'+command+'" command on a build');
                }
              }, cliErrorHandler);
            case 'instances':
            case 'instance':
              var instanceName = args.shift();
              if(!instanceName) return cliResponse(client.instances.list(serverName));
              command = args.shift();
              if (command == 'set') {
                var buildId = args.shift();
                var configFile = args.shift()
                if (!configFile) configFile = './' + instanceName + '.json';
                var config = _.fs.readFileSync(configFile, {encoding: 'utf8'});
                config = JSON.parse(config);
                return cliResponse(client.instances.set(serverName, instanceName, buildId, config));
              }
              client.instances.get(serverName, instanceName).then(function(instance) {
                if(!command) return console.log(instance);
                switch (command) {
                  case 'remove':
                    return cliResponse(client.instances.remove(serverName, instanceName));
                  case 'setConfig':
                    var configFile = args.shift()
                    if (!configFile) configFile = './' + instanceName + '.json';
                    var config = _.fs.readFileSync(configFile, {encoding: 'utf8'});
                    config = JSON.parse(config);
                    return cliResponse(client.instances.setConfig(serverName, instanceName, config));
                  case 'setBuild':
                    var buildId = args.shift()
                    return cliResponse(client.instances.setBuild(serverName, instanceName, buildId));
                  default:
                    throw new Error('Cannot run "'+command+'" command on an instance');
                }
              }, cliErrorHandler);
            default:
              throw new Error('Cannot run "'+command+'" on a server');
          }
        }
      }, cliErrorHandler);
    case 'app':
    case 'apps':
      appName = args.shift();
      if(!appName) return cliResponse(client.apps.list());
      return client.apps.get(appName).then(function(app) {
        // in the case of a "404", send them a list
        if(!app) return cliResponse(client.apps.list());
        else {
          command = args.shift();
          if(!command) console.log(app);
          switch (command) {
            case 'rename':
              var newName = args.shift();
              return cliResponse(client.apps.rename(appName, newName));
            case 'remove':
              return cliResponse(client.apps.remove(appName));
            default:
              throw new Error('Cannot run "'+command+'" on an app');
          }
        }
      }, cliErrorHandler);
  }

});