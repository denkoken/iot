var log4js = require('log4js');
var logger = log4js.getLogger('system');

exports.IoNode = function(settings) {

  // camera
  if (settings.camera) {
    var Camera = require('./camera.js').Camera;
    this.camera = new Camera(settings.camera.id);
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
