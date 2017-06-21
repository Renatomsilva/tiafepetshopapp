var validator = require('validator')
	, Document = require('./documents')
	, moment = require('moment');


let Validations = {
	'userProfile': {
		'name': {
			message: 'Nome inválido'
			, validate: (value) => !validator.isEmpty(value)
		}
	}
};

module.exports.Validations = Validations;
