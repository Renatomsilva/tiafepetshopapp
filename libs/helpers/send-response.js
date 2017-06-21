class Response {

	constructor() {}

	static send(res, result) {
		var className = result ? result.constructor.name.toLowerCase() : null;
		if (className == 'error'){
			res.status(500).send(result);
		}else
			res.status(200).send(result);
	}
}

module.exports = Response;
