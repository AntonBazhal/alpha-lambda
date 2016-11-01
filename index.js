'use strict';

module.exports = function(handler) {
	if (typeof handler !== 'function') {
		throw new Error('handler is not a function');
	}

	return function(event, context, callback) {
		return new Promise((resolve, reject) => {
				if (handler.length < 3) {
					resolve(handler(event, context));
				} else {
					handler(event, context, (err, result) => {
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
