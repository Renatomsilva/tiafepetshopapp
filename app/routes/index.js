var changeCase = require('change-case')
  , express = require('express')
  , routes = require('require-dir')();

module.exports = function (app, passport) {
  Object.keys(routes).forEach(function (routeName) {
    var router = express.Router();
    require('./' + routeName)(router, passport, app);
    app.use('/api/v1/' + changeCase.paramCase(routeName), router);
  });
};