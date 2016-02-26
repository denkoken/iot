var log4js = require('log4js');
log4js.configure('../config/log.json');
var logger = log4js.getLogger('system');

logger.info('Start IOT Camera Node');

// require
var conf = require('config');

// local utils
var Camera = require('../utils/camera').Camera
var Serial = require('../utils/' + conf.serial_mode).Serial
var RpcClient = require('../utils/rpc_wrapper.js').RpcClient;

// applications
var camera = new Camera(conf.camera_id);
var serial = new Serial(conf.serial_dev);

var server_url = conf.rpc_url + conf.rpc_namespase;
console.log(server_url);
var rpc_client = new RpcClient(server_url, conf.rpc_passwd);
rpc_client.addObject(camera, 'camera');
rpc_client.addObject(serial, 'serial');
rpc_client.connectServer();
