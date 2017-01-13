'use strict';

const loggerExtension = require('./lib/logger-extension');
const utils = require('./lib/utils');

module.exports = function(handler, options) {
	if (typeof handler !== 'function') {
		throw new Error('handler is not a function');
	}

	options = options || {}; // eslint-disable-line no-param-reassign

	['onBefore', 'onAfter', 'onError'].forEach(hookMethod => {
		if (options[hookMethod] && typeof options[hookMethod] !== 'function') {
			throw new Error(`options.${hookMethod} must be a function when present`);
		}
	});

	if (options.errorStack && typeof options.errorStack !== 'boolean') {
		throw new Error('options.errorStack must be a boolean when present');
	}

	return function(event, context, callback) {
		const newContext = loggerExtension(context);

		return Promise
			.resolve(new Promise(
				(resolve, reject) => {
					if (options.onBefore) {
						options.onBefore(event, newContext);
					}

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
				.then(result => utils.callHook(options.onAfter, result, event, newContext))
				.then(result => callback(null, result))
				.catch(err => {
					return Promise
						.resolve(utils.callErrorHook(options.onError, err, event, newContext))
						.then(result => utils.callHook(options.onAfter, result, event, newContext))
						.then(result => callback(null, result));
				})
			)
			.catch(err => callback(utils.sanitizeError(err, options)));
	};
};
