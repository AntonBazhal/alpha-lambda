'use strict';

module.exports = function sanitizeErrors(event, context, next) {
	return next()
		.catch(err => {
			if (err && err.stack) {
				err.stack = ''; // eslint-disable-line no-param-reassign
			}
			return Promise.reject(err);
		});
};
