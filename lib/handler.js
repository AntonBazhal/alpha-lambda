'use strict';

module.exports = function () {
	const middleware = [];

	// modified from github.com/koajs/compose
	function dispatch (state, i = 0) {
		const fn = middleware[i] || Function.prototype;
		const next = (err, context) => {
			if (context) {
				Object.assign(state, { context });
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
		dispatch({ event, context })
			.then(result => callback(null, result))
			.catch(err => callback(err));
	};

	handler.use = mw => {
		middleware.push(mw);
		return handler;
	};

	return handler;
};
