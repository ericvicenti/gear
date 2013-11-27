var _ = require('./util');

var cloudflare = module.exports = {};

cloudflare.request = function(action, opts) {
  opts = opts || {};
  var url = 'https://www.cloudflare.com/api_json.html';
  var params = {
    tkn: _.config.cloudFlare.token,
    email: _.config.cloudFlare.email,
    a: action
  }
  params = _.extend(params, opts);
  url += '?' + _.qs.stringify(params);
  return _.request({
    method: 'POST',
    url: url
  }).then(function(res) {
    return JSON.parse(res[0].body);
  });
}

cloudflare.domains = function() {
  return cloudflare.request('zone_load_multi').then(function(res) {
    if(!res.result == 'success') throw new Error('Not successful');
    return res.response.zones.objs;
  });
}

cloudflare.getDomain = function(domain) {
  return cloudflare.request('zone_settings', { z: domain }).then(function(res) {
    if(!res.result == 'success') throw new Error('Not successful');
    return res.response.result.objs[0];
  });
}

cloudflare.getDomainRecords = function(domain) {
  return cloudflare.request('rec_load_all', { z: domain }).then(function(res) {
    if(!res.result == 'success') throw new Error('Not successful');
    return res.response.recs.objs;
  });
}

cloudflare.newDomainRecord = function(domain, recordName, recordType, recordContent, ttl) {
  if(!ttl) ttl = 1;
  return cloudflare.request('rec_new', {
      z: domain,
      name: recordName,
      type: recordType,
      content: recordContent,
      ttl: ttl
    }).then(function(res) {
    if(!res.result == 'success') throw new Error('Not successful');
    return res.response.rec.obj;
  });
}