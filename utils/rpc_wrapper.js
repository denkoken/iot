var log4js = require('log4js');
var logger = log4js.getLogger('system');

// --- Socket.io RPC (call only 'server -> client') ---
// Last arguments should be callback, and last arguments of the registered
// object functions also must be callback.
// example)
// on server : server.obj.method(arg1, arg2, function(ret){ ... });
// on client : will call obj.method(arg1, arg2, function(){ emit to server } )

var getDeepObject = function(obj, prop_array, create) {
  var sub = obj;
  prop_array.forEach(function(prop) {
      if (create && !sub[prop]) {
        logger.debug('Create empty obj: ' + prop);
        sub[prop] = {};
      }
      sub = sub[prop];
      if (typeof sub !== 'object') {
        logger.error('Invalid prop_array: ' + obj + ' ' + prop_array);
      }
  });
  return sub;
};

// --- Server side RPC ---
exports.RpcServer = function(io, namespase, passwd) {
  var that = this;

  // Get empty object
  this.getObject = function() {
    // arguments to array
    var prop_array = Array.prototype.slice.call(arguments);
    // create empty object
    return getDeepObject(this, prop_array, true);
  };

  // register server side rpc call
  var registerServerCall = function (socket, obj, prop_array, func_name) {
    var id = prop_array.concat([func_name]).join('.');
    logger.trace('RPC add "' + id + '"');

    if (obj[func_name]) {
      logger.warn('RPC ' + id + ' is already registered');
      return;
    }

    // callback queue
    var callbacks = [];
    // register method
    obj[func_name] = function() {
      logger.trace('RPC ' + id + ' is called');

      var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
      var callback = arguments[arguments.length - 1];
      // check callback
      if (arguments.length === 0 ||
        typeof callback !== 'function') {
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
        if (callback) callback.apply(null, ret);
    });
  };

  this.start = function() {
    io.of(namespase).on('connection', function(socket) {
        logger.info('RPC connection established');
        var authed = false;
        var func_list = [];

        // Authorizing
        socket.on('auth', function(data) {
            if (data.passwd === passwd) {
              logger.info('RPC authorized');
              authed = true;
            }
        });

        // Add client function
        socket.on('add_func', function(data) {
            if (!authed) {
              logger.error('RPC is not authorized');
              return;
            }
            func_list.push({
                prop_array: data.prop_array,
                func_name: data.func_name,
            });

            // get object
            var obj = getDeepObject(that, data.prop_array, true);
            // register function and returning event
            registerServerCall(socket, obj, data.prop_array, data.func_name);
        });
        // Remove function
        socket.on('disconnect', function() {
            logger.info('RPC connection closed');
            func_list.forEach(function(data) {
                var obj = getDeepObject(that, data.prop_array, false);
                obj[data.func_name] = undefined;
            });
        });
    });
  };
};

// --- client side RPC ---
exports.RpcClient = function(server_url, passwd) {
  var client = require('socket.io-client');
  var that = this;

  var objs = {};
  this.addObject = function(obj, obj_name) {
    objs[obj_name] = obj;
  };

  // register event: rpc client method call
  var registerClientCall = function(socket, obj, prop_array, func_name) {
    var id = prop_array.concat([func_name]).join('.');
    logger.trace('RPC add "' + id + '"');

    // Event: Rpc method call
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

    // Emit function info to server
    socket.emit('add_func', {prop_array: prop_array, func_name: func_name});
  };

  var addRpcFunction = function(obj, prop_array, socket) {
    for (var prop_name in obj) {
      var prop = obj[prop_name];
      if (typeof prop === 'object') {
        // recursive call
        addRpcFunction(prop, prop_array.concat([prop_name]), socket);
      } else if (typeof prop === 'function') {
        // register method call event and emit
        registerClientCall(socket, obj, prop_array, prop_name);
      }
    }
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
        addRpcFunction(objs, [], socket);
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

// --- Get object with creation ---
// example)
//  `safeget(obj, 'prop1', 'prop2');` means `obj.prop1.prop2`
//
exports.safeget = function() {
  var obj = arguments[0];
  var prop_array = Array.prototype.slice.call(arguments, 1);
  return getDeepObject(obj, prop_array, true);
};

// --- Call method with existence check ---
// example)
//  `safecall(obj, 'method', arg1, arg2);` means `obj.method(arg1, arg2);`
//
exports.safecall = function() {
  var obj = arguments[0];
  var func_name = arguments[1];
  var args = Array.prototype.slice.call(arguments, 2);
  if (typeof obj === 'object' && obj[func_name]) {
    obj[func_name].apply(obj, args);
  } else {
    logger.debug('Undefined call: ' + func_name + '()');
  }
};
