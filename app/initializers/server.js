module.exports = function (app, passport) {
  // require('./auth/strategy');
  require('../routes/index')(app, passport);
};
