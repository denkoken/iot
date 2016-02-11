var log4js = require('log4js');
log4js.configure('log_settings.json');
var logger = log4js.getLogger('system');
logger.info('start server');

var express = require('express')
var http = require('http');
var socketio = require('socket.io');

var app = express();
var server = http.createServer(app);
var io = socketio(server);

var Camera = require('./camera').Camera
var camera = new Camera(0);

var Serial = require('./serial').Serial
var serial = new Serial('/dev/tty.usbmodem1421');


app.use(log4js.connectLogger(log4js.getLogger('express')));
app.use(express.static(__dirname + '/public'));

server.listen(3000, function(){
    logger.info('listening on *:3000');
});

camera.changeInterval(1000);
var user_cnt = 0;

io.of('/camera').on('connection', function(socket) {
  logger.info('socketio /camera connected');

  if (user_cnt == 0) {
    camera.changeInterval(50);
  }
  user_cnt++;

  // capture frame
  socket.emit('frame', camera.get());
  socket.on('frame', function() {
      socket.emit('frame', camera.get());
  });

  // servo control
  socket.on('move', function(data) {
      logger.debug('move' + data.x + " " + data.y);

      serial.setCameraAngle(0, data.x * 20 + 20);
      serial.setCameraAngle(1, data.y * 20 + 20);
      //serial.setLed(1);
  });

  // disconnect
  socket.on('disconnect', function() {
      logger.info('socketio /camera disconnect');

      user_cnt--;
      if (user_cnt == 0) {
        camera.changeInterval(1000);
      }
  });
});
