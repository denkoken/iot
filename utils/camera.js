var log4js = require('log4js');
var logger = log4js.getLogger('system');

var cv = require('opencv');

// 1 pixel simple image
var simpleImage = function(encode){
  var mat = new cv.Matrix(1, 1, cv.Constants.CV_8UC3);
  var buf = new Buffer(3);
  buf[0] = 0; buf[1] = 127; buf[2] = 0; // green image
  mat.put(buf);
  return mat.toBuffer(encode);
};

exports.Camera = function(id, ratio_array) {
  var that = this;

  var settings = { // TODO configure
    size: {width: 320, height: 240},
    interval_time: 1000,
    min_interval_time: 100, // depend on camera device
    resize: {enabled: false, width: 320, height: 240},
    encode: {ext: '.jpg', jpegQuality: 70}
  };

  // open camera
  var camera = null;
  try {
    logger.info('Open camera (' + id + ')');
    camera = new cv.VideoCapture(id);
  } catch (e) {
    logger.error(e.message);
  }

  // encoded capture
  var buff = simpleImage(settings.encode);
  // last update time
  var last_update = Date.now();
  // interval object
  var cap_interval = null;

  // capture
  var update = function() {
    var diff = Date.now() - last_update;
    if (camera && diff > settings.min_interval_time){
      camera.read(function(err, im) {
          if (!err) {
            // image resize
            var resize = settings.resize;
            if (resize.enabled) {
              im.resize(resize.width, resize.height);
            }
            // save
            buff = im.toBuffer(settings.encode);
          }
          last_update = Date.now();
      });
    }
  };

  // capture size
  this.setCaptureSize = function(width, height, callback) {
    if (!camera) return;
    if (width) settings.size.width = width;
    if (height) settings.size.height = height;
    camera.setWidth(settings.size.width);
    camera.setHeight(settings.size.height);
    logger.info('Set camera capture size (' +
                settings.size.width + ', ' +
                settings.size.height + ')');
    if (callback) callback();
  };

  // get encoded image
  this.get = function(callback) {
    if (callback) callback(buff);
  };

  // capture interval
  this.changeInterval = function(ms, callback) {
    // lower limit
    if (ms < settings.min_interval_time){
      ms = settings.min_interval_time;
    }
    logger.info('Change camera capture interval (' + ms + ' ms)');

    // clear
    clearInterval(cap_interval);

    // new interval
    settings.interval_time = ms;
    cap_interval = setInterval(function () {
      update();
    }, ms);

    if (callback) callback();
  };

  var ratio = ratio_array[0] / ratio_array[1];
  this.getRatio = function(callback) {
      callback(ratio);
  };

  // initial settings
  this.setCaptureSize();
  this.changeInterval(settings.interval_time);
};
