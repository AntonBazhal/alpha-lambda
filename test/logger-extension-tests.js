'use strict';

const _ = require('lodash');
const bunyan = require('bunyan');
const expect = require('chai').expect;

const loggerExtension = require('../lib/logger-extension');
const testContext = require('./utils/testContext');

describe('logger-extension', function() {

	it('should add log property to context', function() {
		expect(testContext).not.to.have.property('log');

		const fixture = loggerExtension(testContext);

		expect(fixture)
			.to.have.property('log')
			.that.is.an.instanceof(bunyan);
	});

	it('should add child property to context', function() {
		expect(testContext).not.to.have.property('child');

		const fixture = loggerExtension(testContext);

		expect(fixture)
			.to.have.property('child')
			.that.is.a('function');
	});

	it('should have default fields added to each log record', function() {
		const fixture = loggerExtension(testContext);

		expect(fixture).to.have.property('log');
		expect(fixture.log).to.have.deep.property('fields.name', testContext.functionName);
		expect(fixture.log).to.have.deep.property('fields.awsRequestId', testContext.awsRequestId);
		expect(fixture.log).to.have.deep.property('fields.functionVersion', testContext.functionVersion);
	});

	describe('#child', function() {
		it('should create child context', function() {
			const testField = 'testField';
			const fixture = loggerExtension(testContext);
			const fixtureClone = _.cloneDeep(fixture);

			const newContext = fixture.child({ testField });
			expect(fixture).deep.equals(fixtureClone, 'fixture should not be mutated');
			expect(newContext).not.to.deep.equal(fixture);
			expect(newContext).to.have.deep.property('log.fields.testField', testField);
		});
	});

	describe('serializers', function() {
		it('should have serializers set', function() {
			const fixture = loggerExtension(testContext);

			expect(fixture)
				.to.have.property('log')
				.that.has.property('serializers')
				.that.deep.equals({
					err: loggerExtension.serializers.error,
					error: loggerExtension.serializers.error,
					context: loggerExtension.serializers.context
				});
		});

		describe('contextSerializer', function() {
			it('should omit "log" and "child" properties', function() {
				const initialContext = {
					log: 'log',
					child: 'child',
					meaningOfLife: 42
				};

				const sanitizedContext = loggerExtension.serializers.context(initialContext);
				expect(sanitizedContext).to.deep.equal({
					meaningOfLife: initialContext.meaningOfLife
				});
			});
		});

		describe('errorSerializer', function() {
			it('should not do anything if error is not an object', function() {
				const testError = 'error';

				const sanitizedError = loggerExtension.serializers.error(testError);
				expect(sanitizedError).to.deep.equal(testError);
			});

			it('should handle case when error is not an instance of the Error class', function() {
				const testError = {
					message: 'Winter is coming!',
					details: {
						temperature: -1
					}
				};

				const sanitizedError = loggerExtension.serializers.error(testError);
				expect(sanitizedError).to.deep.equal(testError);
			});

			it('should handle case when error is an instance of the Error class without additional fields', function() {
				const testError = new Error('Winter is coming!');

				const sanitizedError = loggerExtension.serializers.error(testError);
				expect(sanitizedError).to.have.property('message', testError.message);
				expect(sanitizedError).to.have.property('name');
				expect(sanitizedError).to.have.property('stack');
			});

			it('should handle case when error is an instance of the Error class with additional fields', function() {
				const testError = new Error('Winter is coming!');
				testError.details = {
					temperature: -1
				};

				const sanitizedError = loggerExtension.serializers.error(testError);
				expect(sanitizedError).to.have.property('message', testError.message);
				expect(sanitizedError).to.have.property('name');
				expect(sanitizedError).to.have.property('stack');
				expect(sanitizedError)
					.to.have.property('details')
					.that.deep.equals(testError.details);
			});
		});
	});
});
