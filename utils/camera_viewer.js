var log4js = require('log4js');
var logger = log4js.getLogger('system');


// Register camera viewer to express and socket.io
exports.registerCameraApp = function(app, io, camera, serial) {
  // default camera interval
  camera.changeInterval(1000);

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
        camera.changeInterval(100);
      }
      user_cnt++;

      // event : capture frame
      socket.emit('frame', camera.get());
      socket.on('frame', function() {
          socket.emit('frame', camera.get());
      });

      // event : servo control
      socket.on('move', function(data) {
          var angle_x = parseInt(data.x * 50 + 60); // TODO configure
          var angle_y = parseInt(data.y * 50 + 60);
          logger.debug('Servo move : ' + angle_x + ', ' + angle_y);

          serial.setCameraAngle(0, angle_x, function() { // TODO configure
              serial.setCameraAngle(1, angle_y);
          });
      });

      // event : disconnect
      socket.on('disconnect', function() {
          logger.info('Disconnect socket.io /camera : ' +
                      socket.request.session.user);

          user_cnt--;
          // scale capture interval
          if (user_cnt == 0) {
            camera.changeInterval(1000);
          }
      });
  });
}
