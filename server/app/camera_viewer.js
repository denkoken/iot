var log4js = require('log4js');
var logger = log4js.getLogger('system');

var rpc_wrapper = require('../../utils/rpc_wrapper.js');
var safeget = rpc_wrapper.safeget;
var safecall = rpc_wrapper.safecall;
var waitcall = rpc_wrapper.waitcall;


var emitUsersInfo = function(socket, user_list, broadcast) {
  logger.trace('Emit user_list');
  if (broadcast) socket = socket.broadcast;
  socket.emit('usersInfo', user_list);
};

var emitNodesInfo = function(socket, node_list, broadcast) {
  logger.trace('Emit node_list');
  if (broadcast) socket = socket.broadcast;
  socket.emit('nodesInfo', node_list);
};

// --- Register camera viewer to express and socket.io ---
exports.registerCameraApp = function(app, io, io_nodes, settings) {
  // config variables
  var app_namespace = settings.app_namespace;
  var io_namespace = settings.io_namespace;
  var interval_ms = settings.interval_ms;

  // express page
  app.get(app_namespace, function(req, res){
      // *** check login user ***
      if (req.session.user) {
        res.render('main.ejs', {script: 'camera_client.js'});
      } else {
        res.redirect('/');
      }
  });

  // default camera interval
  io_nodes.forEach(function(io_node) {
    var camera = safeget(io_node, 'camera');
    safecall(camera, 'changeInterval', 1000, function(){});
  });

  var user_list = [];
  var node_list = [];

  // update node_list
  var updateNodeList = function() {
    node_list = []; // clear
    var back_cnt = 0;
    io_nodes.forEach(function(io_node, idx) {
        safecall(io_node, 'getName', function(name) {
            node_list[idx] = name;
            // wait for all returning
            back_cnt++;
            if (back_cnt === io_nodes.length) {
              emitNodesInfo(io.of(io_namespace), node_list, false);
            }
        });
    });
  };
  updateNodeList(); // initial update
  io_nodes.addOnChangeListener(updateNodeList); // add as event listener

  // socket.io application
  io.of(io_namespace).on('connection', function(socket) {
      // *** check login user ***
      if (!socket.request.session.user) {
        logger.info('No-login user access (socket.io ' + io_namespace + ')');
        socket.disconnect();
        return;
      }
      logger.info('Connection socket.io ' + io_namespace +' : ' +
                  socket.request.session.user);

      // append user to user_list
      user_list.push(socket.request.session.user);
      emitUsersInfo(socket, user_list, true);

      // current io_node variables
      var camera = null;
      var serial = null;
      // change using io_node
      var changeIoNode = function(idx) {
        if (0 <= idx && idx < io_nodes.length) {
          camera = safeget(io_nodes[idx], 'camera');
          serial = safeget(io_nodes[idx], 'serial');
          // create emitting data
          safecall(camera, 'getRatio', function(ratio) {
              emit_data = {activeNode: idx, ratio: ratio};
              socket.emit('changeIoNode', emit_data);
          });
        } else {
          logger.warn('changeIoNode(): Invalid index (' + idx + ')');
        }
      };
      changeIoNode(0);

      // scale capture interval (n_user: 0 -> 1)
      if (user_list.length === 1) {
        safecall(camera, 'changeInterval', true, function(){}); // active
      }

      // event : emit captured frame
      var preemit_ms = Date.now();
      socket.on('frame', function(node_idx) {
          // control emit interval
          var next_ms = preemit_ms + interval_ms - Date.now();
          if (next_ms < 0) next_ms = 0;
          setTimeout(function() {
            safecall(camera, 'get', function(ret) {
                socket.emit('frame', {img: ret, nodeIdx: node_idx});
                preemit_ms = Date.now();
            });
          }, next_ms);
      });

      // event : servo control
      socket.on('moveServo', function(data) {
          var angle_x = parseInt(data.x * 20 + 20); // TODO configure
          var angle_y = parseInt(data.y * 20 + 20);
          logger.debug('Servo move : ' + angle_x + ', ' + angle_y);

          safecall(serial, 'setCameraAngle', 0, angle_x, function() { // TODO configure
          safecall(serial, 'setCameraAngle', 1, angle_y, function() {
              logger.debug('serial setCameraAngle finished');
          });});
      });

      // event : user list
      socket.on('usersInfo', function(data) {
          logger.trace('socket.io request: usersInfo');
          emitUsersInfo(socket, user_list, false);
      });

      // event : nodes info
      socket.on('nodesInfo', function(data) {
          logger.trace('socket.io request: nodesInfo');
          emitNodesInfo(socket, node_list, false);
      });

      // event : change using io_node
      socket.on('changeIoNode', function(data) {
          logger.trace('socket.io request: changeIoNode');
          changeIoNode(data.idx);
      });

      // event : disconnect
      socket.on('disconnect', function() {
          logger.info('Disconnect socket.io ' + io_namespace +' : ' +
                      socket.request.session.user);

          // remove user from list
          user_list.some(function(v, i) {
              var idx = user_list.indexOf(socket.request.session.user);
              if(idx >= 0) user_list.splice(idx, 1);
          });
          emitUsersInfo(socket, user_list, true);

          // scale capture interval (n_user: 1 -> 0)
          if (user_list.length === 0) {
            safecall(camera, 'changeInterval', false, function(){}); // normal
          }
      });
  });
};
