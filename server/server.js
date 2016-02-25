var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');

logger.info('Start IOT Server');

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
    if(err) {
      logger.error(err);
    } else {
      logger.info('Connect mongodb');
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
var Camera = require('../utils/camera').Camera
var Serial = require('../utils/' + conf.serial_mode).Serial
var Viewer = require('../utils/camera_viewer.js');
// TODO Add more applications (e.g. chat, admin page, log viewer)

// applications
var camera = new Camera(conf.camera_id);
var serial = new Serial(conf.serial_dev);
Viewer.registerCameraApp(app, io, camera, serial); // '/camera'


// login page
app.get('/login', function(req, res) {
    if(req.session.user) {
      res.redirect('/camera');
    } else {
      res.render('main.ejs', {script: 'login_client.js'});
    }
});

// login (authenticate user)
app.post('/login', function(req, res) {
    var name = req.body.name;
    var password = req.body.password;
    var query = {name: name, password: password};
    logger.info('Login attempt : ' + name);

    UserModel.find(query, function(err, result) {
        if(err) {
          logger.error(err);
          return;
        }

        if(result.length === 0 && query.name !== 'debug') { // TODO remove debug
          res.json({message: 'Invalid user or password'});
        } else {
          if(req.session.user) {
            res.json({message: 'Multiple login'});
          } else {
            // create session
            logger.info('Create session:' + req.session.user);
            req.session.user = name;
            res.json({redirect: '/camera'});
          }
        }
    });
});

// account management page
app.get('/management', function(req, res){
    if(req.session.user) {
      logger.debug('management');
        res.render('main.ejs', {script: 'account_management.js'}); 
        logger.debug('render');
    } else {
    }
});

app.post('/management', function(req, res){
    var name = req.body.name;
    var password = req.body.password;
    var query = {name: name, password: password};
    logger.info('Create account : ' + name);

    UserModel.create(query, function(err, result) {
        if(err) {
            logger.error(err);
            return;
          }

          res.json({redirect: '/camera'});
    });
});

// logout (delete session)
app.get('/logout', function(req, res) {
    logger.info('Delete session: ' + req.session.user);
    req.session.destroy();
    res.redirect('/');
});

// all redirect
app.get('/*', function(req, res) {
    res.redirect('/login');
});

// start listen
server.listen(3000, function() {
    logger.info('Listening on *:3000');
});
