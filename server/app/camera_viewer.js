var log4js = require('log4js');
var logger = log4js.getLogger('system');

var safecall = function() {
  var obj = arguments[0];
  var func_name = arguments[1];
  var args = Array.prototype.slice.call(arguments, 2);
  var func = obj[func_name];
  if(func) func.apply(obj, args);
  else logger.debug('undefined call');
}


// Register camera viewer to express and socket.io
exports.registerCameraApp = function(app, io, camera, serial) {
  // default camera interval
  safecall(camera, 'changeInterval', 1000, function(){});

  // express page
  app.get('/camera', function(req, res){
      // *** check login user ***
      if(req.session.user) {
        res.render('main.ejs', {script: 'camera_client.js'});
      } else {
        res.redirect('/');
      }
  });

  var user_cnt = 0;

  // socket.io application
  io.of('/camera').on('connection', function(socket) {

      // *** check login user ***
      if(!socket.request.session.user){
        logger.info('No-login user access (socket.io /camera)');
        socket.disconnect();
        return;
      }
      logger.info('Connection socket.io /camera : ' +
                  socket.request.session.user);

      // scale capture interval
      if (user_cnt == 0) {
        safecall(camera, 'changeInterval', 100, function(){});
      }
      user_cnt++;

      // event : capture frame
      socket.on('frame', function() {
          safecall(camera, 'get', function(ret) {
              socket.emit('frame', ret);
          });
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

      // event : disconnect
      socket.on('disconnect', function() {
          logger.info('Disconnect socket.io /camera : ' +
                      socket.request.session.user);

          user_cnt--;
          // scale capture interval
          if (user_cnt == 0) {
            safecall(camera, 'changeInterval', 1000, function(){});
          }
      });
  });
}
