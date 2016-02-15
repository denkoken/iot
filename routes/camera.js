var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');

var conf = require('config');

var express = require('express');

var router = express.Router();

router.get('/camera',function(req,res,next){
  var name = req.session.user;
  res.render('camera.ejs',{user:name});
});

module.exports = router;
