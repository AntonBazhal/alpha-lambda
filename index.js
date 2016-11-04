'use strict';

const loggerExtension = require('./lib/logger-extension');

module.exports = function(handler) {
	if (typeof handler !== 'function') {
		throw new Error('handler is not a function');
	}

	return function(event, context, callback) {
		const newContext = loggerExtension(context);

		return new Promise((resolve, reject) => {
				if (handler.length < 3) {
					resolve(handler(event, newContext));
				} else {
					handler(event, newContext, (err, result) => {
						if (err) {
							reject(err);
						} else {
							resolve(result);
						}
					});
				}
			})
			.then(result => callback(null, result))
			.catch(err => callback(err));
	}
};
