var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');
logger.info('start server');

var express = require('express')
var http = require('http');
var socketio = require('socket.io');
var conf = require('config');

var app = express();
var server = http.createServer(app);
var io = socketio(server);

var Camera = require('./utils/camera').Camera
var camera = new Camera(conf.camera_id);

var Serial = require(conf.serial_util).Serial
var serial = new Serial(conf.serial_dev);


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

      var angle_x = parseInt(data.x * 20 + 20);
      var angle_y = parseInt(data.y * 20 + 20);
      serial.setCameraAngle(0, angle_x, function() {
          serial.setCameraAngle(1, angle_y);
      });
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
