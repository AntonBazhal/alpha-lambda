'use strict';

const _ = require('lodash');
const bunyan = require('bunyan');

function child(fields) {
	const newContext = _.cloneDeep(this);
	const log = this.log.child(fields);

	return Object.assign(newContext, { log });
}

function contextSerializer(context) {
	return _.omit(context, ['log', 'child']);
}

function errorSerializer(err) {
	const bunyanError = bunyan.stdSerializers.err(err);
	if (!_.isObject(err) || !_.isObject(bunyanError)) {
		return bunyanError;
	}

	return _.assign({}, err, bunyanError);
}

module.exports = function(event, context, next) {
	const newContext = _.cloneDeep(context);
	const log = bunyan.createLogger({
		name: context.functionName,
		level: process.env.LOG_LEVEL || bunyan.INFO,
		awsRequestId: context.awsRequestId,
		functionVersion: context.functionVersion,
		serializers: {
			err: errorSerializer,
			error: errorSerializer,
			context: contextSerializer
		}
	});

	Object.assign(newContext, { log, child });

	return next(null, newContext);
};

module.exports.serializers = {
	context: contextSerializer,
	error: errorSerializer
};
