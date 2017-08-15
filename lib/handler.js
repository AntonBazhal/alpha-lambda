'use strict';

const logging = require('./extensions/logging');
const sanitizeErrors = require('./extensions/sanitizeErrors');

module.exports = function () {
	const middleware = [];
	const handler = (event, context, callback) => {
		let currentContext = context;
		let currentResult;

		// modified from github.com/koajs/compose
		let index = -1;
		function dispatch (i) {
			try {
				const fn = middleware[i] || Function.prototype;
				const next = (err, newContext) => {
					if (err) {
						return Promise.reject(err);
					}
					if (newContext) {
						currentContext = newContext;
					}
					return dispatch(i + 1);
				};

				if (i <= index) {
					throw new Error('next() called more than once');
				}
				index = i;

				return Promise.resolve(fn(event, currentContext, next))
					.then(newResult => {
						if (newResult === undefined) {
							return;
						}
						currentResult = newResult;
					});
			} catch (err) {
				return Promise.reject(err);
			}
		}

		dispatch(0)
			.then(() => callback(null, currentResult))
			.catch(e => callback(e));
	};

	handler.use = mw => {
		middleware.push(mw);
		return handler;
	};

	return handler;
};

Object.assign(module.exports, { logging, sanitizeErrors });
