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
//     var data;
//     var axis_mask = (axis ? 1<<6 : 0);
//     var angle_mask = (angle & (1<<6)-1);
//
//     data = (1<<7) | axis_mask | angle_mask;

    // TODO(takiyu): Fix
    // 2 byte protocol
    var data0 = [(1 << 7) | ((axis & 3) << 5)];
    var data1 = [(0 << 7) | (angle & 0x7f)];

    var that = this;
    that.sp.write(data0, function(err0, res0) {
        if(err0){
          logger.error(err0);
          if(callback) callback();
          return;
        }
        that.sp.write(data1, function(err1, res1) {
            if(err1) logger.error(err1);
            logger.trace('servo motion is finished');
            if(callback) callback();
        });
    });
  }; 

  this.getCameraAngle = function(axis) {
    if(!this.sp.isOpen()) return;
//     var data;
//     var axis_mask = (axis ? 1 : 0);
//     var read_mask = (1<<6);
//
//     data = 0 | read_mask | axis_mask;
//
//     sp.write(data);
//     sp.read(data);
//
//     var value = data & ((1<<7)-1);
//     return value;
    return 0;
  };

  this.setLed = function(value) {
    if(!this.sp.isOpen()) return;
//     var data;
//     var led_mask = (1<<5);
//     var switch_mask = (value ? 1 : 0);
//     data = 0 | led_mask | switch_mask;
//
//     sp.write(data);
  };
};
