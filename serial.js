var serialPort = require("serialport")
var sp = new serialPort.SerialPort("/dev/tty.usbmodem1421", {
	baudrate : 9600,
	dataBits:8,
	parity:'none',
	flowControl:false
});

var data = (1<<7) + 15;

sp.on("open", function() {
	console.log('open');
	setTimeout(function(){
		sp.write(data);		
		console.log('sended msg');
	}, 2000);
});









