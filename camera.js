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
  var that = this;

  this.settings = {
    size: {width: 320, height: 240},
    min_interval: 100,
    resize: {enabled: false, width: 320, height: 240},
    encode: {ext: ".jpg", jpegQuality: 80}
  };

  // open camera
  try {
    logger.info('open camera (' + id + ')');
    this.camera = new cv.VideoCapture(id);
  } catch(e) {
    logger.error(e.message);
  }

  // encoded capture
  var buff = SimpleImage(this.settings.encode);
  // last update time (ms)
  var last_update = Date.now();

  // capture size
  this.setCaptureSize = function(width, height) {
    if (width) this.settings.size.width = width;
    if (height) this.settings.size.height = height;
    this.camera.setWidth(this.settings.size.width);
    this.camera.setHeight(this.settings.size.height);
    logger.info('set capture size (' +
                this.settings.size.width + ', ' +
                this.settings.size.height + ')');
  }

  // capture
  this.update = function() {
    var interval = Date.now() - last_update;
    if(this.camera &&  interval > that.settings.min_interval){
      this.camera.read(function(err, im) {
          if (!err) {
            // image resize
            var resize = that.settings.resize
            if (resize.enabled) {
              im.resize(resize.width, resize.height);
            }
            // save
            buff = im.toBuffer(that.settings.encode);
            last_update = Date.now();
          }
      });
    }
  }

  // get encoded image
  this.get = function() {
    return buff;
  }

  this.setCaptureSize();
  this.update(); // initial update
};
