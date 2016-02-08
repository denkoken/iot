var serialPort = require("serialport")

exports.Serial = function(id){
  this.sp = new serialPort.SerialPort(id, {
    baudrate : 9600,
    dataBits:8,
    parity:'none',
    flowControl:false
  });

  this.setCameraAngle = function(axis, angle) {
    var data;
    var axis_mask = (axis ? 1<<6 : 0);
    var angle_mask = (angle & (1<<6)-1);

    data = (1<<7) | axis_mask | angle_mask;

    this.sp.write(data);
  };  

  this.getCameraAngle = function(axis) {
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
    var data;
    var led_mask = (1<<5);
    var switch_mask = (value ? 1 : 0);
    data = 0 | led_mask | switch_mask;

    sp.write(data);
  };

};
