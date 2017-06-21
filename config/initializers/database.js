var config = require('nconf')
  , mysql = require('mysql')
  , validator = require('validator')
  , listErrors = require('../../libs/helpers/errors-list')
  , ValidationModel = require('../../libs/models/response/validation')
  , ValidateAttribute = require('../../libs/models/validate/attribute');

module.exports = (function () {

  let instance = null;

  class Connection {
    constructor() {
      if (!instance) {
        instance = this;
      }
      this.pool = mysql.createPool({
        host: config.get('DB_HOST'),
        user: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        connectionLimit: config.get('DB_CONNECTIONS_LIMIT'),
        waitForConnections: true,
        supportBigNumbers: true,
        multipleStatements: true
      });

       this.pool.on('connection', function (connection) {
       connection.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;')
      });

      this.pool.on('error', function (err) {
        console.log(err.code);
      });

      return instance;
    }

    getPool() {
        return this.pool;
    }
    
    getConnection(error, callback){
      this.pool.getConnection(function(err, connection) {
        if(err){
          error(new ValidationModel('fail', 'validation', listErrors['ErrorDataBaseConnection'].message, [new ValidateAttribute('connection', listErrors['ErrorDataBaseConnection'].message)], listErrors['ErrorDataBaseConnection'].errorCode));
        }else{
          callback(connection);
        }
      })
    }
  }

  return Connection;

})();
