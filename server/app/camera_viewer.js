var log4js = require('log4js');
var logger = log4js.getLogger('system');

var rpc_wrapper = require('../../utils/rpc_wrapper.js');
var safeget = rpc_wrapper.safeget;
var safecall = rpc_wrapper.safecall;


var emitUsers = function(socket, user_list, broadcast) {
  if (broadcast) socket.broadcast.emit('updateUsers', {users: user_list});
  else socket.emit('updateUsers', {users: user_list});
};

// --- Register camera viewer to express and socket.io ---
exports.registerCameraApp = function(app, io, io_nodes, settings) {
  // config variables
  var interval_ms = settings.interval_ms;

  // default camera interval
  io_nodes.forEach(function(io_node) {
    var camera = safeget(io_node, 'camera');
    safecall(camera, 'changeInterval', 1000, function(){});
  });

  // express page
  app.get('/camera', function(req, res){
      // *** check login user ***
      if (req.session.user) {
        res.render('main.ejs', {script: 'camera_client.js'});
      } else {
        res.redirect('/');
      }
  });

  var user_list = [];

  // socket.io application
  io.of('/camera').on('connection', function(socket) {
      // *** check login user ***
      if (!socket.request.session.user) {
        logger.info('No-login user access (socket.io /camera)');
        socket.disconnect();
        return;
      }
      logger.info('Connection socket.io /camera : ' +
                  socket.request.session.user);

      // append user to list
      user_list.push(socket.request.session.user);
      emitUsers(socket, user_list, true);

      // current io_node variables
      var camera = safeget(io_nodes[0], 'camera');
      var serial = safeget(io_nodes[0], 'serial');
      var changeIoNode = function(idx) {
        if (0 <= idx && idx < io_nodes.length) {
          camera = safeget(io_nodes[idx], 'camera');
          serial = safeget(io_nodes[idx], 'serial');
        } else {
          logger.error('changeIoNode(): Invalid index (' + idx + ')');
        }
      };

      // scale capture interval (n_user: 0 -> 1)
      if (user_list.length === 0) {
        safecall(camera, 'changeInterval', 100, function(){});
      }

      // event : emit captured frame
      var preemit_ms = Date.now();
      socket.on('frame', function() {
          // control emit interval
          var next_ms = preemit_ms + interval_ms - Date.now();
          if (next_ms < 0) next_ms = 0;
          setTimeout(function() {
            safecall(camera, 'get', function(ret) {
                socket.emit('frame', ret);
                preemit_ms = Date.now();
            });
          }, next_ms);
      });

      // event : servo control
      socket.on('move', function(data) {
          var angle_x = parseInt(data.x * 50 + 60); // TODO configure
          var angle_y = parseInt(data.y * 50 + 60);
          logger.debug('Servo move : ' + angle_x + ', ' + angle_y);

          safecall(serial, 'setCameraAngle', 0, angle_x, function() { // TODO configure
          safecall(serial, 'setCameraAngle', 1, angle_y, function() {
              logger.debug('serial setCameraAngle finished');
          });});
      });

      // event : user list
      socket.on('updateUsers', function(data) {
          logger.trace('socket.io request: usersUpdate');
          emitUsers(socket, user_list, false);
      });

      // event : change using io_node
      socket.on('changeIoNode', function(data) {
          logger.trace('socket.io request: changeIoNode');
          changeIoNode(data.idx);
      });

      // event : disconnect
      socket.on('disconnect', function() {
          logger.info('Disconnect socket.io /camera : ' +
                      socket.request.session.user);

          // remove user from list
          user_list.some(function(v, i) {
              if (v == socket.request.session.user) user_list.splice(i, 1);
          });
          emitUsers(socket, user_list, true);

          // scale capture interval (n_user: 1 -> 0)
          if (user_list.length === 0) {
            safecall(camera, 'changeInterval', 1000, function(){});
          }
      });
  });
};
