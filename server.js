var express = require('express')
var http = require('http');
var socketio = require('socket.io');

var app = express();
var server = http.createServer(app);
var io = socketio(server);


var Camera = require('./camera').Camera
var camera = new Camera(0);

app.use(express.static(__dirname + '/public'));

server.listen(3000, function(){
		console.log('listening on *:3000');
});


io.of('/camera').on('connection', function(socket) {
  console.log('connection');

  socket.emit('frame', camera.get());
  socket.on('frame', function() {
      camera.update();
      socket.emit('frame', camera.get());
  });

  socket.on('move', function(data) {
      console.log(data.x);//[-1:1]
      console.log(data.y);
  });

  socket.on('disconnect', function() {
      console.log('disconnect');
  });
});
