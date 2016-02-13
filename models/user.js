var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');

var conf = require('config');

var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    name : String,
    password : String
},{
    collection : conf.collection_name
});

var User = mongoose.model('user',userSchema); 

module.exports = User;
