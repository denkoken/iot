var log4js = require('log4js');
var logger = log4js.getLogger('system');

var serialport = require('serialport');

exports.Serial = function(dev){
  var that = this;

  this.sp = new serialport.SerialPort(dev, {
      baudrate : 9600,
      dataBits : 8,
      parity : 'none',
      flowControl : false
  }, false);

  // open serial port
  logger.info('Open serial (' + dev + ')');
  this.sp.open(function(err) {
      if(err) logger.error(err);
  });

  this.setCameraAngle = function(axis, angle, callback) {
    if(!this.sp.isOpen()) return;

    var data0 = [(1 << 7) | ((axis & 1) << 5)];
    var data1 = [(0 << 7) | (angle & ((1 << 7) - 1))];

    this.sp.write(data0, function(err0, res0) {
        if(err0){
          logger.error(err0);
          return;
        }
        that.sp.write(data1, function(err1, res1) {
            if(err1) logger.error(err1);
            if(callback) callback();
        });
    });
  };

  this.getCameraAngle = function(axis, callback) {
    if(!this.sp.isOpen()) return;
    logger.error('getCameraAngle() is not implemented');
  };

  this.setLed = function(value, callback) {
    if(!this.sp.isOpen()) return;
    logger.error('setLed() is not implemented');
  };
};
