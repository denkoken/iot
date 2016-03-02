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

  this.startServer = function() {
    io.of(namespase).on('connection', function(socket) {
        logger.info('RPC connection established');
        var authed = false;
        var obj_names = new Array();

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
            var obj_name = data.obj;
            var func_names = data.funcs;
            obj_names.push(obj);

            // register object to that
            if(!that[obj_name]) that[obj_name] = {};
            var obj = that[obj_name];

            // register functions
            func_names.forEach(function(func_name) {
                // unique method name
                var id = obj_name + '.' + func_name;
                // register function and returning event
                (function(id, obj, obj_name, func_name) {
                    // callback queue
                    var callbacks = new Array();
                    // register method
                    obj[func_name] = function() {
                      logger.trace('RPC ' + id + ' is called');
                      if(!authed) {
                        logger.error('RPC is not authorized');
                        return;
                      }
                      var args = Array.prototype.slice.call(arguments, 0,
                                                        arguments.length - 1);
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
                })(id, obj, obj_name, func_name);
            });
        });
        // Remove function
        socket.on('disconnect', function() {
            logger.info('RPC connection closed');
            obj_names.forEach(function(obj_name) {
                var obj = that[obj];
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

  var objs = {}
  this.addObject = function(obj, obj_name) {
    objs[obj_name] = obj;
  };

  this.connectServer = function() {
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
          var func_names = new Array();
          for(var func_name in obj) {
            // type check
            if(typeof obj[func_name] !== "function") continue;
            func_names.push(func_name);

            // unique method name
            var id = obj_name + '.' + func_name;
            // Event: method call
            (function(id, obj, obj_name, func_name) {
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
            })(id, obj, obj_name, func_name);
          }

          // Emit object info to server
          logger.trace('RPC add "' + obj_name + '", "' + func_names + '"');
          socket.emit('add_obj', {obj: obj_name, funcs: func_names});
        }
    });
    // On Disconnect
    socket.on('disconnect', function() {
        logger.info('RPC connection closed');
        // new connection (clear events)
        logger.info('Try to reconnect RPC server: ' + server_url);
        socket = client.connect(server_url);
    });
  };
};
