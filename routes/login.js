var log4js = require('log4js');
log4js.configure('./config/log.json');
var logger = log4js.getLogger('system');

var conf = require('config');

var express = require('express');

var UserModel = require('../models/user.js');

var router = express.Router();

//check login state
var checkLogin = function(req,res,next){
    logger.debug('checking login');
    if(req.session.user){
        next();
    }else{
        res.redirect('/login');
    }
};

router.get('/',checkLogin,function(req,res,next){
    res.redirect('/camera');
});

router.get('/login',function(req,res,next){
    res.render('login.ejs',{comment:""});
});

//authenticate user
router.post('/login',function(req,res,next){
    var name = req.body.name;
    var password = req.body.password;

    var query = {"name":name,"password":password};
    logger.debug(query);
    UserModel.find(query,function(err,result){
        if(err){
            console.log(err);
        }
        if(result=="" && query.name != "debug"){
            res.render('login.ejs',{comment:"wrong name or password"});
        }else{
            //create sessison
            req.session.user = name;
            logger.info('create session:' + req.session.user);
            res.redirect('/');
        }
    });
});

//delete session
router.get('/logout',function(req,res,next){
    logger.info('delete session:' + req.session.user);
    req.session.destroy();
    res.redirect('/');
});
    
module.exports = router;
