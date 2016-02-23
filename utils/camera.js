var log4js = require('log4js');
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
    interval_time: 100,
    min_interval_time: 100, // depend on camera device
    resize: {enabled: false, width: 320, height: 240},
    encode: {ext: '.jpg', jpegQuality: 80}
  };

  // open camera
  try {
    logger.info('Open camera (' + id + ')');
    this.camera = new cv.VideoCapture(id);
  } catch(e) {
    logger.error(e.message);
  }

  // encoded capture
  var buff = SimpleImage(this.settings.encode);
  // last update time
  var last_update = Date.now();
  // interval object
  var cap_interval = null;

  // capture
  var update = function() {
    var diff = Date.now() - last_update;
    if(that.camera && diff > that.settings.min_interval_time){
      that.camera.read(function(err, im) {
          if (!err) {
            // image resize
            var resize = that.settings.resize
            if (resize.enabled) {
              im.resize(resize.width, resize.height);
            }
            // save
            buff = im.toBuffer(that.settings.encode);
          }
          last_update = Date.now();
      });
    }
  }

  // capture size
  this.setCaptureSize = function(width, height) {
    if (!this.camera) return;
    if (width) this.settings.size.width = width;
    if (height) this.settings.size.height = height;
    this.camera.setWidth(this.settings.size.width);
    this.camera.setHeight(this.settings.size.height);
    logger.info('Set camera capture size (' +
                this.settings.size.width + ', ' +
                this.settings.size.height + ')');
  }

  // get encoded image
  this.get = function() {
    return buff;
  }

  // capture interval
  this.changeInterval = function(ms) {
    // lower limit
    if(ms < this.settings.min_interval_time){
      ms = this.settings.min_interval_time;
    }
    logger.info('Change camera capture interval (' + ms + ' ms)')

    // clear
    clearInterval(cap_interval);

    // new interval
    this.settings.interval_time = ms;
    cap_interval = setInterval(function () {
      update();
    }, ms);
  }

  // initial settings
  this.setCaptureSize();
  this.changeInterval(this.settings.interval_time);
};
