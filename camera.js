var cv = require('opencv');

exports.Camera = function(id) {
  this.camera = new cv.VideoCapture(id);
  this.settings = {
    encode: {ext: ".jpg", jpegQuality: 90}
  };

  var buff = null;

  var that = this;
  this.update = function(){
    this.camera.read(function(err, im) {
        if (!err) {
          buff = im.toBuffer(that.settings.encode);
        }
    });
  };

  this.get = function() {
    return buff;
  }

  this.update(); // initial update
};
