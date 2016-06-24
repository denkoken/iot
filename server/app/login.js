var log4js = require('log4js');
var logger = log4js.getLogger('system');

// --- Register login page to express ---
exports.registerLoginApp = function(app, user_model, settings) {
  var redirect = settings.redirect;
  var namespace = settings.namespace;
  var debug_mode = settings.debug_mode;

  // login page
  app.get(namespace, function(req, res) {
      if (req.session.user) {
        res.redirect(redirect);
      } else {
        res.render('login.ejs', {script: 'login_client.js'});
      }
  });

  // user authentication
  app.post(namespace, function(req, res) {
      var name = req.body.name;
      var password = req.body.password;
      var query = {name: name, password: password};
      logger.info('Login attempt : ' + name);

      user_model.find(query, function(err, result) {
          if (err) {
            logger.error(err);
            return;
          }

          if (result.length === 0 && (!(debug_mode) || query.name !== 'debug')) { // TODO remove debug
            res.json({message: 'Invalid user name or password'});
          } else {
            if (req.session.user) {
              res.json({message: 'Multiple login'});
            } else {
              // create session
              logger.info('Create session:' + req.session.user);
              req.session.user = name;
              res.json({redirect: redirect});
            }
          }
      });
  });
};
