var log4js = require('log4js');
log4js.configure('../config/log.json');
var logger = log4js.getLogger('system');

logger.info('Start IOT Server');

// require
var body_parser = require('body-parser');
var conf = require('config');
var ejs = require('ejs');
var express = require('express');
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
mongoose.connect(conf.db.name, function(err) {
    if (err) {
      logger.error(err);
    } else {
      logger.info('Connect mongodb');
    }
});
var user_model = mongoose.model('user', new mongoose.Schema({
      name : String,
      password : String
    }, {
      collection : conf.db.collection_name
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


// local utility
// var Camera = require('../utils/camera.js').Camera;
// var Serial = require('../utils/' + conf.serial.mode).Serial;
var RpcServer = require('../utils/rpc_wrapper.js').RpcServer;
var Login = require('./app/login.js');
var Viewer = require('./app/camera_viewer.js');
// TODO Add more applications (e.g. chat, admin page, log viewer)

// utility instance
// var camera = new Camera(conf.camera.id);
// var serial = new Serial(conf.serial.dev);
var rpc_server = new RpcServer(io, conf.rpc.namespase, conf.rpc.passwd);
var camera = rpc_server.getObject('camera');
var serial = rpc_server.getObject('serial');
rpc_server.start();

// register applications
Login.registerLoginApp(app, user_model, {
    redirect: '/camera'
}); // '/login'
Viewer.registerCameraApp(app, io, camera, serial, {
    interval_ms: conf.camera_viewer.interval
}); // '/camera'


// account management page
app.get('/management', function(req, res) {
    if (req.session.user) {
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

    user_model.create(query, function(err, result) {
        if (err) {
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
