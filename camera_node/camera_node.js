var log4js = require('log4js');
log4js.configure('../config/log.json');
var logger = log4js.getLogger('system');

logger.info('Start IOT Camera Node');

// require
var conf = require('config');

// local utility
var Camera = require('../utils/camera.js').Camera;
var Serial = require('../utils/' + conf.serial.mode).Serial;
var RpcClient = require('../utils/rpc_wrapper.js').RpcClient;

// utility instance
var camera = new Camera(conf.camera.id);
var serial = new Serial(conf.serial.dev);

// add to rpc
var server_url = conf.rpc.url + conf.rpc.namespase;
var rpc_client = new RpcClient(server_url, conf.rpc.passwd);
rpc_client.addObject(camera, 'camera');
rpc_client.addObject(serial, 'serial');
rpc_client.connect();
