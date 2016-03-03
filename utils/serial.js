var log4js = require('log4js');
var logger = log4js.getLogger('system');

var serialport = require('serialport');

exports.Serial = function(dev){
  var that = this;

  var sp = new serialport.SerialPort(dev, {
      baudrate : 9600,
      dataBits : 8,
      parity : 'none',
      flowControl : false
  }, false);

  // open serial port
  logger.info('Open serial (' + dev + ')');
  sp.open(function(err) {
      if (err) logger.error(err);
  });

  this.setCameraAngle = function(axis, angle, callback) {
    if (!sp.isOpen()) return;

    if (angle >= 40) {
      logger.error('Angle is too large : angle=' + angle);
      return;
    }

    var data = [(1 << 7) | (axis ? (1 << 6) : 0)
                         | (angle & ((1 << 6) - 1))];
    sp.write(data, function(err, res) {
        if (err) logger.error(err);
        if (callback) callback();
    });
  };

  this.getCameraAngle = function(axis, callback) {
    if (!sp.isOpen()) return;

    var data = [0 | (axis ? 1 : 0) | (1 << 6)];
    sp.write(data, function(err, res){
        if (err) logger.error(err);
        if (callback) callback(res & ((1<<7)-1)); 
    });
  };

  this.setLed = function(value, callback) {
    if (!sp.isOpen()) return;

    var data = [0 | (1 << 5) | (value ? 1 : 0)];
    sp.write(data, function(err, res){
        if (err) logger.error(err);
        if (callback) callback();
    });
  };
};
