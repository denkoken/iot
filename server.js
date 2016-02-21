var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');

logger.info('start server');

// require
var body_parser = require('body-parser');
var conf = require('config');
var ejs = require('ejs');
var express = require('express')
var express_session = require('express-session');
var http = require('http');
var socketio = require('socket.io');
var mongoose = require('mongoose');
var connect_mongo = require('connect-mongo/es5');

// instance
var app = express();
var server = http.createServer(app);
var io = socketio(server);

// express logger
app.use(log4js.connectLogger(log4js.getLogger('express')));
// public routing
app.use(express.static(__dirname + '/public'));
// template engine
app.engine('ejs', ejs.renderFile);
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: false}));

// MongoDB for user sesstion
var MongoStore = connect_mongo(express_session);
mongoose.connect(conf.db_name, function(err) {
    if(err){
      logger.error(err);
    } else {
      logger.info("connect mongodb");
    }
});
var UserModel = mongoose.model('user', new mongoose.Schema({
      name : String,
      password : String
    }, {
      collection : conf.collection_name
    }
)); 

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


// local utils
var Camera = require('./utils/camera').Camera
var Serial = require(conf.serial_util).Serial
var Viewer = require('./utils/camera_viewer.js');

// applications
var camera = new Camera(conf.camera_id);
var serial = new Serial(conf.serial_dev);
Viewer.registerCameraApp(app, io, camera, serial); // '/camera'


// login page
app.get('/login', function(req, res) {
    if(req.session.user){
      res.redirect("/camera");
    } else {
      res.render('main.ejs', {script: "login_client.js"});
    }
});

// login (authenticate user)
app.post('/login', function(req, res) {
    var name = req.body.name;
    var password = req.body.password;
    var query = {"name": name, "password": password};
    logger.debug(query);

    UserModel.find(query, function(err, result) {
        if(err) console.log(err);

        if(result.length === 0 && query.name !== "debug") { // TODO remove debug
          res.json({error_type: "false"});
        } else {
          //create sessison
          req.session.user = name;
          logger.info('create session:' + req.session.user);
          res.redirect('camera');
        }
    });
})

// logout (delete session)
app.get('/logout', function(req, res) {
    logger.info('delete session: ' + req.session.user);
    req.session.destroy();
    res.redirect('/');
});

// all redirect
app.get('/*', function(req, res) {
    res.redirect("/login");
});

// start listen
server.listen(3000, function() {
    logger.info('listening on *:3000');
});
