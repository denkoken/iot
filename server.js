var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');
logger.info('start server');

var conf = require('config');

var http = require('http');

var express = require('express')

var ejs = require('ejs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose'); 
var session = require('express-session'); 
var MongoStore = require('connect-mongo')(session);
var socketio = require('socket.io');

var loginRouter = require('./routes/login');
var cameraRouter = require('./routes/camera');

var app = express();
app.engine('ejs',ejs.renderFile);
var server = http.createServer(app);
var io = socketio(server);

var Camera = require('./utils/camera').Camera
var camera = new Camera(conf.camera_id);

var Serial = require(conf.serial_util).Serial
var serial = new Serial(conf.serial_dev);

app.use(log4js.connectLogger(log4js.getLogger('express')));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

//connect mongodb
mongoose.connect(conf.db_name,function(err){
    if(err){
        console.log(err);
    }
    else
    {
        logger.info("connect mongodb");
    }
});

//set session
var sessionStore = new MongoStore({mongooseConnection:mongoose.connection});
var sessionSecret = 'secret';
var sessionMiddleware = session({
    secret:sessionSecret,
    store:sessionStore
});
app.use(sessionMiddleware);
io.use(function(socket,next){
    sessionMiddleware(socket.request,socket.request.res,next);
});

app.use(loginRouter);
app.use(cameraRouter);

server.listen(3000, function(){
    logger.info('listening on *:3000');
});

camera.changeInterval(1000);
var user_cnt = 0;

// camera socket.io connection
io.of('/camera').on('connection', function(socket) {
  logger.info('socket.io /camera connected');

  if(socket.request.session.user){
    logger.info('login with '+socket.request.session.user);
    if (user_cnt == 0) {
      camera.changeInterval(100);
    }
    user_cnt++;

    // capture frame
    socket.emit('frame', camera.get());
    socket.on('frame', function() {
      socket.emit('frame', camera.get());
    });
    
    // servo control
    socket.on('move', function(data) {
      var angle_x = parseInt(data.x * 50 + 60);
      var angle_y = parseInt(data.y * 50 + 60);
      logger.debug('move:' + angle_x + "," + angle_y);

      serial.setCameraAngle(0, angle_x, function() {
        serial.setCameraAngle(1, angle_y);
      });
    });

    // disconnect
    socket.on('disconnect', function() {
      logger.info('socketio /camera disconnect');

      user_cnt--;
      if (user_cnt == 0) {
        camera.changeInterval(1000);
      }
    });
  }
  else
  {
    logger.info('nologin user access');
  }
});

