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


function listServers() {
  client.servers.list().then(function(servers) {
    console.log('NAME \tHOST');
    console.log('=======\t=======');
    _.each(servers, function(server) {
      console.log(server.name+' \t'+server.host);
    });
  }, cliErrorHandler);
}

function printServer(server) {
  console.log('Name: '+server.name);
  console.log('Host: '+server.host);
}

function listInstances(serverName) {
  client.instances.list(serverName).then(function(_instances) {
    console.log('NAME \tBUILD\tSTATUS');
    console.log('=======\t=======\t=======');
    _.each(_instances, function(i, b) {
      console.log(i.name+'\t'+i.build+'\t'+i.status);
    });    
  }, cliErrorHandler);
}

function printInstance(instance) {
  console.log('Name: '+instance.name);
  console.log('Build: '+instance.build);
  console.log('Status: '+instance.status);
  console.log('PID: '+instance.pid);
  console.log('Uptime: '+instance.uptime);
}


function listBuilds(serverName) {
   client.builds.list(serverName).then(function(builds) {
    console.log('ID\tSTATUS\tCOMMIT\tREFSPEC');
    console.log('=======\t=======\t=======\t=======');
    _.each(builds, function(b) {
      var ch = b.commithash ? b.commithash.substring(0,7) : '';
      console.log(b.id+'\t'+b.status+'\t'+ch+'\t'+b.refspec);
    });    
  }, cliErrorHandler);
}

function printBuild(build) {
  console.log('Id: '+build.id);
  console.log('Status: '+ build.status + ' - ' + build.statusMsg);
  console.log('Repo Url: '+build.repoUrl);
  console.log('Refspec: '+build.refspec);
  console.log('Commit Hash: '+build.commithash);
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
      if(!serverName) return listServers();
      return client.servers.get(serverName).then(function(server) {
        // in the case of a "404", send them a list
        if(!server) return listServers();
        else {
          command = args.shift();
          if(!command) return printServer(server);
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
                  return cliResponse(client.builds.build(serverName, appName, refspec));
                default:
                  throw new Error('Cannot add "'+type+'" to this server');
              }
            case 'builds':
            case 'build':
              var id = args.shift();
              if(!id) return listBuilds(serverName);
              else return client.builds.get(serverName, id).then(function(build) {
                command = args.shift();
                if(!command) return printBuild(build);
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
              if(!instanceName) return listInstances(serverName);
              command = args.shift();
              if (command == 'set') {
                var buildId = args.shift();
                var configFile = args.shift()
                if (!configFile) configFile = './' + instanceName + '.json';
                var config = _.fs.readFileSync(configFile, {encoding: 'utf8'});
                config = JSON.parse(config);
                return cliResponse(client.instances.set(serverName, instanceName, buildId, config));
              }
              if (command == 'build') {
                var appName = args.shift();
                var refspec = args.shift();
                var configFile = args.shift()
                var config = configFile ? JSON.parse(_.fs.readFileSync(configFile, {encoding: 'utf8'})) : undefined;
                return cliResponse(client.instances.build(serverName, instanceName, appName, refspec, config));
              }
              client.instances.get(serverName, instanceName).then(function(instance) {
                if(!command) return printInstance(instance);
                switch (command) {
                  case 'remove':
                    return cliResponse(client.instances.remove(serverName, instanceName));
                  case 'config':
                    return cliResponse(client.instances.getConfig(serverName, instanceName));
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