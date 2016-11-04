'use strict';

const bunyan = require('bunyan'),
	cloneDeep = require('lodash/cloneDeep'),
	omit = require('lodash/omit');

function child(fields) {
	const newContext = cloneDeep(this);
	const log = this.log.child(fields);

	return Object.assign(newContext, { log });
}

function contextSerializer(context) {
	return omit(context, [ 'log', 'child' ]);
}

module.exports = function(context) {
	const newContext = cloneDeep(context);
	const log = bunyan.createLogger({
		name: context.functionName,
		level: process.env.LOG_LEVEL || bunyan.INFO,
		awsRequestId: context.awsRequestId,
		functionVersion: context.functionVersion,
		serializers: {
			err: bunyan.stdSerializers.err,
			error: bunyan.stdSerializers.err,
			context: contextSerializer
		}
	});

	return Object.assign(newContext, { log, child });
};
