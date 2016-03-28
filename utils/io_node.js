var log4js = require('log4js');
var logger = log4js.getLogger('system');


// --- Extended IoNode array ---
exports.IoNodeCollection = function() {
  var listeners = [];

  this.addOnChangeListener = function(func) {
    listeners.push(func);
  };

  var pollOnChangeListener = function(event_name) {
    listeners.forEach(function(listener) {
        listener();
    });
  };

  this.addAndPoll = function(io_node) {
    this.push(io_node);
    // call listener
    pollOnChangeListener();
  };

  this.removeAndPoll = function(io_node) {
    var idx = this.indexOf(io_node);
    if(idx >= 0) this.splice(idx, 1);
    // call listener
    pollOnChangeListener();
  };
};
exports.IoNodeCollection.prototype = new Array();


// --- IoNode ---
exports.IoNode = function(name, settings) {

  // node name
  this.getName = function(callback) {
    callback(name);
  };

  // camera
  if (settings.camera) {
    var Camera = require('./camera.js').Camera;
    this.camera = new Camera(settings.camera);
  } else {
    logger.info('IoNode: No camera mode');
  }

  // serial
  if (settings.serial) {
    var Serial = require('./' + settings.serial.mode + '.js').Serial;
    this.serial = new Serial(settings.serial.dev);
  } else {
    logger.info('IoNode: No serial mode');
  }

};
