canvas = document.getElementById('image_canvas');
canvas.width = 640;
canvas.height = 480;
ctx = canvas.getContext('2d');

var socket = io.connect('/camera');
socket.on('frame', function(jpg){
    var b64jpg = btoa(String.fromCharCode.apply(null, new Uint8Array(jpg)));
    var img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64jpg;
    img.onload = function () {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      socket.emit('frame');
    };
});
