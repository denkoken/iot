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

exports.Camera = function(settings) {
  var that = this;

  // fixed setting
  var encode = {ext: '.jpg'};

  // load settings
  var id = settings.id || 0;
  var size = settings.size || {width: 320, height: 240};
  var ratio = settings.ratio ? settings.ratio[0] / settings.ratio[1]
                             : 3.0 / 4.0;
  var normal_interval_time = settings.normal_interval || 1000;
  var active_interval_time = settings.active_interval || 100;
  var resize = settings.resize || {enabled: false, width: 320, height: 240};
  var rotate = settings.rotate || {enabled: false, degree: 0};
  encode.jpegQuality = settings.jpeg_quality || 70;

  logger.info('Camera settings:\n' +
    '  id:' + id +
    '  size:' + size.width + ',' + size.height  +
    '  normal_interval:' + normal_interval_time +
    '  active_interval_time:' + active_interval_time + '\n' +
    '  resize:' + resize.enabled + ',' + resize.width + ',' + resize.height +
    '  jpeg_quality:' + encode.jpegQuality);

  // open camera
  var camera = null;
  try {
    logger.info('Open camera (' + id + ')');
    camera = new cv.VideoCapture(id);
  } catch (e) {
    logger.error(e.message);
  }

  // encoded capture
  var buff = simpleImage(encode);
  // last update time
  var last_update = Date.now();
  // interval object
  var cap_interval = null;
  // current interval ms
  var cur_interval_time = normal_interval_time;

  // capture
  var update = function() {
    var diff = Date.now() - last_update;
    if (camera && diff > cur_interval_time){
      camera.read(function(err, im) {
          if (!err) {
            // image resize
            if (resize.enabled) {
              im.resize(resize.width, resize.height);
            }
            // image rotate
            if (rotate.enabled) {
              im.rotate(rotate.degree);
            }
            // save
            buff = im.toBuffer(encode);
          }
          last_update = Date.now();
      });
    }
  };

  // capture size
  this.setCaptureSize = function(width, height, callback) {
    if (!camera) return;
    size.width = width;
    size.height = height;
    camera.setWidth(size.width);
    camera.setHeight(size.height);
    logger.info('Set camera capture size (' +
                size.width + ', ' + size.height + ')');
    if (callback) callback();
  };

  // get encoded image
  this.get = function(callback) {
    if (callback) callback(buff);
  };

  // capture interval
  this.changeInterval = function(active, callback) {
    // lower limit
    var ms = active ? active_interval_time : normal_interval_time;
    logger.info('Change camera capture interval (' +
      ms + 'ms/' + (active ? 'active' : 'normal') + ')');

    // clear
    clearInterval(cap_interval);

    // new interval
    cur_interval_time = ms;
    cap_interval = setInterval(function () {
      update();
    }, ms);

    if (callback) callback();
  };

  this.getRatio = function(callback) {
      callback(ratio);
  };

  // initial settings
  this.setCaptureSize();
  this.changeInterval(cur_interval_time);
};
