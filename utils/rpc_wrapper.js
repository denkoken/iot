var log4js = require('log4js');
var logger = log4js.getLogger('system');

// Buffering RPC (call only 'server -> client')

exports.RpcServer = function(io, namespase, passwd) {
  var that = this;

  // Get empty object
  this.getObject = function(obj_name) {
    if(!this[obj_name]) this[obj_name] = {};
    return this[obj_name];
  };

  this.startServer = function() {
    io.of(namespase).on('connection', function(socket) {
        logger.info('RPC connection established')
        var authed = false;
        var obj_names = new Array();
        // Authorizing
        socket.on('auth', function(data) {
            if(data.passwd === passwd) {
              logger.info('RPC authorized')
              authed = true;
            }
        });
        // Add client function
        socket.on('add_obj', function(data) {
            logger.info('RPC add_objfunc "' + data.obj + "'")
            var obj_name = data.obj;
            var func_names = data.funcs;
            obj_names.push(obj);
            // register object
            if(!that[obj_name]) that[obj_name] = {};
            var obj = that[obj_name];
            // register functions
            func_names.forEach(function(func_name) {
                // unique method name
                var id = obj_name + '.' + func_name;
                // register function
                (function(id, obj, obj_name, func_name){
                    var buffer = undefined;
                    obj[func_name] = function() {
                      logger.info('RPC function "' + obj_name + '.' + func_name + '" is called');
                      if(!authed) {
                        logger.error('RPC is not authorized');
                        return;
                      }
                      // request function call
                      socket.emit('call:' + id, {args: arguments });
                      // returning
                      socket.on('ret:' + id, function(ret) {
                          buffer = ret;
                      });
                      return buffer;
                    };
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
    logger.info('Try to connect RPC server')
    var socket = client.connect(server_url);
    // On Connect
    socket.on('connect', function() {
        logger.info('RPC connection is established.')
        // First authorize
        socket.emit('auth', {passwd: passwd});

        // Add objects
        for (var obj_name in objs) {
          var obj = objs[obj_name];
          // Add rpc function
          var func_names = new Array();
          for(var func_name in obj) {
            if(typeof obj[func_name] !== "function") continue;
            func_names.push(func_name);
            // unique method name
            var id = obj_name + '.' + func_name;
            // Event: method call
            (function(id, obj, obj_name, func_name) {
                socket.on('call:' + id, function(data) {
                    logger.info('RPC client fanction "' + id + '" is called')
                    var ret = obj[func_name].apply(obj, data.args);
                    socket.emit('ret:' + id, ret);
                });
            })(id, obj, obj_name, func_name);
          }
          logger.debug('Emit add_obj "' + obj_name + '", funcs "' + func_names + '"')
          socket.emit('add_obj', {obj: obj_name, funcs: func_names});
        }
    });
    // On Disconnect
    socket.on('disconnect', function() {
        logger.info('RPC connection closed');
    });
  }

};
