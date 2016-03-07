var log4js = require('log4js');
log4js.configure('../config/log.json');
var logger = log4js.getLogger('system');

logger.info('Start IOT Server');

// config base name
var config_local_base = 'io_node_local';

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

// server instance
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
var IoNode = require('../utils/io_node.js').IoNode;
var IoNodeCollection = require('../utils/io_node.js').IoNodeCollection;
var RpcServer = require('../utils/rpc_wrapper.js').RpcServer;
var Login = require('./app/login.js');
var Viewer = require('./app/camera_viewer.js');

// utility instance
var rpc_server = new RpcServer(io, conf.rpc.namespace, conf.rpc.passwd);

// available io_node list
var io_nodes = new IoNodeCollection();
// Read io_node settings from config file
for (var node_name in conf.get(config_local_base)) {
    logger.info('Add local io_node: ' + node_name);
    var local_config = conf.get([config_local_base, node_name].join('.'));
    io_nodes.push(new IoNode(node_name, local_config));
}
// Adaptive remote io_nodes
var onIoNodesChanged = function(ret) {
    var node_name = ret.prop_array[0];
    var obj = rpc_server.getObject(node_name);
    if (ret.event_name === 'add') {
      logger.info('New io_node: ' + node_name);
      io_nodes.addAndPoll(obj);
    } else if (ret.event_name === 'remove') {
      logger.info('Remove io_node: ' + node_name);
      io_nodes.removeAndPoll(obj);
    }
};
// Register listener for `*.getName`
rpc_server.addOnChangeListener('', 'getName', onIoNodesChanged);

// start RPC server
rpc_server.start();

// register applications
Login.registerLoginApp(app, user_model, {
    namespace: '/login',
    redirect: '/camera'
}); // '/login'
Viewer.registerCameraApp(app, io, io_nodes, {
    app_namespace: '/camera',
    io_namespace: '/camera',
    interval_ms: conf.camera_viewer.interval
}); // '/camera'


// TODO Move Account management applications to another jsfile.
// account management page
app.get('/admin', function(req, res) {
    if (req.session.user) {
      logger.debug('admin page');
      res.render('main.ejs', {script: 'admin.js'});
      logger.debug('render');
    } else {
      res.redirect('/login');
    }
});

// account management page
app.get('/join', function(req, res) {
    if (req.session.user) {
      logger.debug('join page');
      res.render('main.ejs', {script: 'join_form.js'});
      logger.debug('render');
    } else {
      res.redirect('/login');
    }
});

app.post('/join', function(req, res){
    var name = req.body.name;
    var password = req.body.password;
    var query = {name: name, password: password};
    logger.info('Create account : ' + name);

    user_model.find({name: name}, function(err, result) {
        if (err) {
          logger.error(err);
          return;
        }

        if (result.length === 0) {
          logger.info('Create Account:' + name);
          user_model.create(query , function(err, result) {
              if (err) {
                logger.error(err);
                return;
              }
              res.json({redirect: '/camera'});
          });
        } else {
          res.json({message: name + ' is already exist'});
        }
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
