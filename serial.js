var log4js = require('log4js');
log4js.configure('log_settings.json');
var logger = log4js.getLogger('system');

var serialport = require('serialport')

exports.Serial = function(dev){
  logger.info('open serial (' + dev + ')');

  this.sp = new serialport.SerialPort(dev, {
      baudrate : 9600,
      dataBits : 8,
      parity : 'none',
      flowControl : false
  }, false);

  // open serial port
  var opened = false;
  this.sp.open(function(err) {
      if(err) {
        logger.error(err);
      } else {
        opened = true;
      }
  });

  this.setCameraAngle = function(axis, angle) {
    if(!opened) return;

    var data;
    var axis_mask = (axis ? 1<<6 : 0);
    var angle_mask = (angle & (1<<6)-1);

    data = (1<<7) | axis_mask | angle_mask;

    this.sp.write(data);
  }; 

  this.getCameraAngle = function(axis) {
    if(!opened) return;

    var data;
    var axis_mask = (axis ? 1 : 0);
    var read_mask = (1<<6);

    data = 0 | read_mask | axis_mask;

    sp.write(data);
    sp.read(data);

    var value = data & ((1<<7)-1);
    return value;
  };

  this.setLed = function(value) {
    if(!opened) return;

    var data;
    var led_mask = (1<<5);
    var switch_mask = (value ? 1 : 0);
    data = 0 | led_mask | switch_mask;

    sp.write(data);
  };
};
