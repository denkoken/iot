var log4js = require('log4js');
log4js.configure('../config/log.json');
var logger = log4js.getLogger('system');

logger.info('Start IOT Camera Node');

// config base name
var config_base = 'io_node_remote';

// require
var conf = require('config');

// local utility
var IoNode = require('../utils/io_node.js').IoNode;
var RpcClient = require('../utils/rpc_wrapper.js').RpcClient;


// parse arguments
if (process.argv.length < 3) {
  var modes = [];
  for (var mode in conf.get(config_base)) {
    modes.push(mode);
  }

  logger.error('No arguments\n' +
    '  usage: npm start <remote_mode>\n' +
    '    <remote_mode> is defined in "../config/default.json"\n' +
    '    current available modes : ' + modes.join(', '));
  process.exit();
}

// read remote config
var node_name = process.argv[2];
var config_name = [config_base, node_name].join('.');
logger.info('Read config: ' + config_name);
if (!conf.has(config_name)) {
  logger.error('Invalid mode or json config');
  process.exit();
}
var remote_config = conf.get(config_name);

// utility instance
var io_node = new IoNode(node_name, remote_config);

// add to RPC
var server_url = conf.rpc.url + conf.rpc.namespase;
var rpc_client = new RpcClient(server_url, conf.rpc.passwd);
rpc_client.addObject(io_node, node_name);
rpc_client.connect();
