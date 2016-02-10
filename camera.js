var log4js = require('log4js');
log4js.configure('log_settings.json');
var logger = log4js.getLogger('system');

var cv = require('opencv');

// 1 pixel simple image
var SimpleImage = function(encode){
  var mat = new cv.Matrix(1, 1, cv.Constants.CV_8UC3);
  var buf = Buffer(3);
  buf[0] = 0; buf[1] = 127; buf[2] = 0; // green image
  mat.put(buf);
  return mat.toBuffer(encode);
}

exports.Camera = function(id) {
  logger.info('open camera (' + id + ')');

  try {
    this.camera = new cv.VideoCapture(id);
  } catch(e) {
    logger.error(e.message);
  }

  this.settings = {
    resize: {enabled: true, width: 320, height: 240},
    encode: {ext: ".jpg", jpegQuality: 80}
  };

  // encoded capture
  var buff = SimpleImage(this.settings.encode);

  var that = this;
  this.update = function() {
    if(this.camera){
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
    }
  }

  this.get = function() {
    return buff;
  }

  this.update(); // initial update
};
