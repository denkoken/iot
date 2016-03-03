var log4js = require('log4js');
var logger = log4js.getLogger('system');


// --- Call method with existence check ---
// example)
//  `safecall(obj, 'method', arg1, arg2);` means `obj.method(arg1, arg2);`
//
var safecall = function() {
  var obj = arguments[0];
  var func_name = arguments[1];
  var args = Array.prototype.slice.call(arguments, 2);
  var func = obj[func_name];
  if (func) func.apply(obj, args);
  else logger.debug('Undefined call: ' + func_name + '()');
};

var emitUsers = function(socket, user_list, broadcast) {
  if (broadcast) socket.broadcast.emit('updateUsers', {users: user_list});
  else socket.emit('updateUsers', {users: user_list});
};

// --- Register camera viewer to express and socket.io ---
exports.registerCameraApp = function(app, io, camera, serial, settings) {
  // camera interval limit
  var interval_ms = settings.interval_ms;

  // default camera interval
  safecall(camera, 'changeInterval', 1000, function(){});

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

      // scale capture interval
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
          logger.debug('Update users request');
          emitUsers(socket, user_list, false);
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

          // scale capture interval
          if (user_list.length === 0) {
            safecall(camera, 'changeInterval', 1000, function(){});
          }
      });
  });
};
