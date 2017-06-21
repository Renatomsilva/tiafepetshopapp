var nconf = require('nconf')
  , async = require('async')
  , logger = require('winston');

require('dotenv').load();

nconf.use('memory');

nconf.argv();
nconf.env();
nconf.file({ file:`${__dirname}/config/environments/${process.env.NODE_ENV}.json`});

var server = require('./config/initializers/batch');

async.series([
  function startServer(callback) {
    server(callback);
  }], function(err) {
    if (err) {
      logger.error('[APP] initialization failed', err);
    } else {
      logger.info('[APP] initialized SUCCESSFULLY');
    }
  }
);

