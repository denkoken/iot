var log4js = require('log4js');
var logger = log4js.getLogger('system');

var serialport = require('serialport');

exports.Serial = function(dev){
  this.sp = new serialport.SerialPort(dev, {
      baudrate : 9600,
      dataBits : 8,
      parity : 'none',
      flowControl : false
  }, false);

  // open serial port
  logger.info('open serial (' + dev + ')');
  this.sp.open(function(err) {
      if(err) logger.error(err);
  });

  this.setCameraAngle = function(axis, angle, callback) {
    if(!this.sp.isOpen()) return;

    var data = [(1<<7) | (axis ? (1<<6) : 0) | (angle & (1<<6)-1)];

    var that = this;
    that.sp.write(data, function(err, res) {
        if(err){
          logger.error(err);
          if(callback) callback();
          return;
        }
    });
  };

  this.getCameraAngle = function(axis) {
    if(!this.sp.isOpen()) return;
    var data = [0 | (axis ? 1:0) | (1<<6)];

    var that = this;
    that.sp.write(data, function(err, res){
      if(err){
     	logger.error(err);
	if(callback) callback();
	return;
      }else{
     	return (data & ((1<<7)-1)); 
      }
    });

    return 0;
  };

  this.setLed = function(value) {
    if(!this.sp.isOpen()) return;
    var data = [0 | (1<<5) | (value ? 1 : 0)];
    var that = this;
    that.sp.write(data, function(err, res){
      if(err){
     	logger.error(err);
	if(callback) callback();
	return;
      } 
    })
  };
};
