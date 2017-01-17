'use strict';

module.exports = {
	callHook(hook, value, event, context) {
		let updatedValue;
		if (hook) {
			updatedValue = hook(value, event, context);
		}

		return updatedValue !== undefined ? updatedValue : value;
	},

	callErrorHook(hook, err, event, context) {
		if (!hook) {
			throw err;
		}

		return module.exports.callHook(hook, err, event, context);
	},

	sanitizeError(err, options) {
		if (options.errorStack) {
			return err;
		}

		if (err && err.stack) {
			err.stack = ''; // eslint-disable-line no-param-reassign
		}

		return err;
	}
};
