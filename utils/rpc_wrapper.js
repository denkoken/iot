var log4js = require('log4js');
var logger = log4js.getLogger('system');

exports.RpcServer = function(io, namespase, passwd) {
  var that = this;

  io.of(namespase).on('connection', function(socket) {
      var func_names = new Array();
      var authed = false;
      // Authorizing
      socket.on('auth', function(data) {
          if (data.passwd === passwd) auth = true;
      });
      // Add client function
      socket.on('add_func', function(data) {
          var name = data.name;
          func_names.push(name);
          console.log('add_func');
          that[name] = function(callback) {
            if(!authed) {
              logger.info("RPC is not authorized.");
              socket.emit('req:auth');
              return;
            }
            // request function call
            socket.emit('call:' + name, {args: arguments });
            // callback
            socket.on('ret:' + name, function(ret) {
                callback(ret);
            });
          };
      });
      // Remove function
      socket.on('disconnect', function() {
          for (var name in func_names) {
            that[name] = undefined;
          }
      });
  });
};

exports.RpcClient = function(obj, server_url, passwd) {
  var client = require('socket.io-client');

  var that = this;
  var socket = client.connect(server_url);

  socket.on('connect', function() {
      // First authorize
      socket.emit('auth', {passwd: passwd});
      // Add rpc function
      for(var func in obj) {
        if(typeof obj[func] !== "function") continue;
        socket.emit('add_func', {name: func});
        socket.on('call:' + func, function(data) {
            var ret = obj[func].apply(obj, data.args);
            socket.emit('ret:' + func, ret);
        });
      }
  });
};
