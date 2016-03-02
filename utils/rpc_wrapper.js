var log4js = require('log4js');
var logger = log4js.getLogger('system');

// --- Socket.io RPC (call only 'server -> client') ---
// Last arguments should be callback, and last arguments of the registered
// object functions also must be callback.
// example)
// on server : server.obj.method(arg1, arg2, function(ret){ ... });
// on client : will call obj.method(arg1, arg2, function(){ emit to server } )

exports.RpcServer = function(io, namespase, passwd) {
  var that = this;

  // Get empty object
  this.getObject = function(obj_name) {
    if(!this[obj_name]) this[obj_name] = {};
    return this[obj_name];
  };

  // register server side rpc call
  var registerServerCall = function (socket, id, obj, obj_name, func_name) {
    // callback queue
    var callbacks = [];
    // register method
    obj[func_name] = function() {
      logger.trace('RPC ' + id + ' is called');

      var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
      var callback = arguments[arguments.length - 1];
      // check callback
      if(arguments.length === 0 ||
        typeof callback !== "function") {
        logger.warn('RPC last argument should be callback');
        // arguments to array
        args = Array.prototype.slice.call(arguments);
        callback = function(ret) {
          logger.debug('RPC ' + id + ' return');
        };
      }
      callbacks.push(callback);

      // request function call
      socket.emit('call:' + id, {args: args});
    };

    // returning event
    socket.on('ret:' + id, function(ret) {
        logger.trace('RPC ' + id + ' callback');
        var callback = callbacks.shift();
        if(callback) callback.apply(null, ret);
    });
  };

  this.start = function() {
    io.of(namespase).on('connection', function(socket) {
        logger.info('RPC connection established');
        var authed = false;
        var obj_names = [];

        // Authorizing
        socket.on('auth', function(data) {
            if(data.passwd === passwd) {
              logger.info('RPC authorized');
              authed = true;
            }
        });

        // Add client function
        socket.on('add_obj', function(data) {
            logger.trace('RPC add ' + data.obj);
            if(!authed) {
              logger.error('RPC is not authorized');
              return;
            }

            var obj_name = data.obj;
            var func_names = data.funcs;
            obj_names.push(obj_name);

            // register object to that
            if(!that[obj_name]) that[obj_name] = {};
            var obj = that[obj_name];

            // register functions
            func_names.forEach(function(func_name) {
                // unique method name
                var id = obj_name + '.' + func_name;
                // register function and returning event
                registerServerCall(socket, id, obj, obj_name, func_name);
            });
        });
        // Remove function
        socket.on('disconnect', function() {
            logger.info('RPC connection closed');
            obj_names.forEach(function(obj_name) {
                var obj = that[obj_name];
                for (var func in obj) {
                  obj[func] = undefined;
                }
            });
        });
    });
  };
};

exports.RpcClient = function(server_url, passwd) {
  var client = require('socket.io-client');
  var that = this;

  var objs = {};
  this.addObject = function(obj, obj_name) {
    objs[obj_name] = obj;
  };

  // register event: rpc client method call
  var registerClientCall = function(socket, id, obj, obj_name, func_name) {
    socket.on('call:' + id, function(data) {
        logger.trace('RPC ' + id + ' is called');

        // append callback to args
        var callback = function() {
          logger.trace('RPC ' + id + ' callback emit');
          // arguments to array
          var ret = Array.prototype.slice.call(arguments);
          // returning emit
          socket.emit('ret:' + id, ret);
        };
        Array.prototype.push.call(data.args, callback);

        // call
        obj[func_name].apply(obj, data.args);
    });
  };

  this.connect = function() {
    logger.info('Try to connect RPC server: ' + server_url);
    var socket = client.connect(server_url);

    // On Connect
    socket.on('connect', function() {
        logger.info('RPC connection is established');
        // First authorize
        socket.emit('auth', {passwd: passwd});

        // Add objects
        for(var obj_name in objs) {
          var obj = objs[obj_name];

          // Add rpc function
          var func_names = [];
          for(var func_name in obj) {
            // type check
            if(typeof obj[func_name] !== "function") continue;
            func_names.push(func_name);

            // unique method name
            var id = obj_name + '.' + func_name;
            // register method call event
            registerClientCall(socket, id, obj, obj_name, func_name);
          }

          // Emit object info to server
          logger.trace('RPC add "' + obj_name + '", "' + func_names + '"');
          socket.emit('add_obj', {obj: obj_name, funcs: func_names});
        }
    });
    // On Disconnect
    socket.on('disconnect', function() {
        logger.info('RPC connection closed');
        // close socket (clear event)
        socket.disconnect();
        // new connection (register new events)
        logger.info('Try to reconnect RPC server: ' + server_url);
        setTimeout(function() { that.connect(); }, 10);
    });
  };
};
