'use strict';

const loggerExtension = require('./lib/logger-extension');

module.exports = require('./lib/handler');

module.exports.extensions = {
	logger: loggerExtension
};
