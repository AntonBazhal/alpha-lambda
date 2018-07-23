'use strict';

module.exports = function () {
	const middleware = [];

	// modified from github.com/koajs/compose
	function dispatch (state, i) {
		const fn = middleware[i] || Function.prototype;
		const next = (err, context, event) => {
			if (context) {
				Object.assign(state, { context });
			}

			if (event) {
				Object.assign(state, { event });
			}

			if (err) {
				return Promise.reject(err);
			}

			return dispatch(state, i + 1);
		};

		return Promise.resolve()
			.then(() => fn(state.event, state.context, next))
			.then(result => {
				if (result !== undefined) {
					Object.assign(state, { result });
				}
				return state.result;
			});
	}

	const handler = (event, context, callback) => {
		return dispatch({ event, context }, 0)
			.then(result => callback(null, result))
			.catch(err => callback(err));
	};

	handler.use = mw => {
		if (typeof mw !== 'function') {
			throw new Error('middleware is not a function');
		}
		middleware.push(mw);
		return handler;
	};

	return handler;
};
