var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');

logger.info('start server');

// require
var conf = require('config');
var express = require('express')
var express_session = require('express-session');
var http = require('http');
var socketio = require('socket.io');
var mongoose = require('mongoose');
var connect_mongo = require('connect-mongo');

// instance
var app = express();
var server = http.createServer(app);
var io = socketio(server);

// local require
var Camera = require('./utils/camera').Camera
var camera = new Camera(conf.camera_id);
var Serial = require(conf.serial_util).Serial
var serial = new Serial(conf.serial_dev);

// express logger
app.use(log4js.connectLogger(log4js.getLogger('express')));
// public routing
app.use(express.static(__dirname + '/public'));

// MongoDB
var MongoStore = connect_mongo(express_session);
mongoose.connect(conf.db_name, function(err) {
    if(err){
      logger.error(err);
    } else {
      logger.info("connect mongodb");
    }
});

// set session
var session = express_session({
    secret : 'NdGOc8UhBKbsuCEG',
    resave : true,
    saveUninitialized : false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
    store : new MongoStore({mongooseConnection: mongoose.connection})
});
app.use(session);
io.use(function(socket, next){
    session(socket.request, socket.request.res, next);
});


//// I would like to replace ejs with reactjs base for more simplicity. (takiyu)
var ejs = require('ejs');
var bodyParser = require('body-parser');
var loginRouter = require('./routes/login');
var cameraRouter = require('./routes/camera');
app.engine('ejs', ejs.renderFile);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(loginRouter);
app.use(cameraRouter);
////


server.listen(3000, function(){
    logger.info('listening on *:3000');
});

camera.changeInterval(1000);
var user_cnt = 0; // TODO experimental variable

// camera socket.io connection
io.of('/camera').on('connection', function(socket) {

    // check login user
    if(!socket.request.session.user){
      logger.info('no-login user access (socket.io camera)');
      socket.disconnect();
      return;
    }
    logger.info('login with ' + socket.request.session.user +
                '(socket.io camera)');

    // scale capture interval
    if (user_cnt == 0) {
      camera.changeInterval(100);
    }
    user_cnt++;

    // capture frame event
    socket.emit('frame', camera.get());
    socket.on('frame', function() {
        socket.emit('frame', camera.get());
    });

    // servo control event
    socket.on('move', function(data) {
        var angle_x = parseInt(data.x * 50 + 60); // TODO configure
        var angle_y = parseInt(data.y * 50 + 60);
        logger.debug('move:' + angle_x + "," + angle_y);

        serial.setCameraAngle(0, angle_x, function() { // TODO configure
        serial.setCameraAngle(1, angle_y);
        });
    });

    // disconnect event
    socket.on('disconnect', function() {
        logger.info('socketio /camera disconnect');

        user_cnt--;
        // scale capture interval
        if (user_cnt == 0) {
          camera.changeInterval(1000);
        }
    });
});

