var cv = require('opencv');

exports.Camera = function(id) {
  this.camera = new cv.VideoCapture(id);
  this.settings = {
    resize: {enabled: true, width: 320, height: 240},
    encode: {ext: ".jpg", jpegQuality: 90}
  };

  var buff = null;

  var that = this;
  this.update = function(){
    this.camera.read(function(err, im) {
        if (!err) {
          // image resize
          var resize = that.settings.resize
          if (resize.enabled) {
            im.resize(resize.width, resize.height);
          }
          // encode
          buff = im.toBuffer(that.settings.encode);
        }
    });
  };

  this.get = function() {
    return buff;
  }

  this.update(); // initial update
};
