'use strict';

const bunyan = require('bunyan'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised');

const lambdaHandler = require('../.');

chai.use(chaiAsPromised);
const expect = chai.expect;

const testContext = {
	functionName: 'testFunction',
	awsRequestId: '00112233445566778899',
	functionVersion: '$LATEST'
};

describe('lambda-handler-as-promised', function() {

	describe('handler', function() {
		it('should throw when handler is not provided', function() {
			expect(lambdaHandler).to.throw(Error, /^handler is not a function$/);
		});

		it('should throw when handler is not a function', function() {
			expect(() => lambdaHandler({})).to.throw(Error, /^handler is not a function$/);
		});

		it('should wrap handler correctly', function() {
			const wrappedHandler = lambdaHandler(() => true);
			expect(wrappedHandler).to.be.a('function');
			expect(wrappedHandler).to.have.length(3);
		});

		it('wrapped handler should return promise', function() {
			const fixture = lambdaHandler(() => true);
			expect(fixture({}, testContext)).eventually.be.an.instanceof(Promise);
		});

		it('wrapped handler should call success callback when plain value is returned', function() {
			const testResult = true;
			const fixture = lambdaHandler(() => testResult);

			return fixture({}, testContext, (err, result) => {
				expect(err).to.not.exist;
				expect(result).to.equal(testResult);
			});
		});

		it('wrapped handler should call success callback when resolved promise is returned', function() {
			const testResult = true;
			const fixture = lambdaHandler(() => Promise.resolve(testResult));

			return fixture({}, testContext, (err, result) => {
				expect(err).to.not.exist;
				expect(result).to.equal(testResult);
			});
		});

		it('wrapped handler should call success callback when success callback is called by handler', function() {
			const testResult = true;
			const fixture = lambdaHandler((event, context, callback) => callback(null, testResult));

			return fixture({}, testContext, (err, result) => {
				expect(err).to.not.exist;
				expect(result).to.equal(testResult);
			});
		});

		it('wrapped handler should call error callback when rejected promise is returned', function() {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler(() => Promise.reject(testError));

			return fixture({}, testContext, (err, result) => {
				expect(err).to.deep.equal(testError);
				expect(result).to.not.exist;
			});
		});

		it('wrapped handler should call error callback when exception is thrown', function() {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler(() => {
				throw testError;
			});

			return fixture({}, testContext, (err, result) => {
				expect(err).to.deep.equal(testError);
				expect(result).to.not.exist;
			});
		});

		it('wrapped handler should call error callback when error callback is called by handler', function() {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler((event, context, callback) => callback(testError));

			return fixture({}, testContext, (err, result) => {
				expect(err).to.deep.equal(testError);
				expect(result).to.not.exist;
			});
		});

		it('wrapped handler should use callback value when both callback is called and value is returned', function() {
			const testResult1 = true;
			const testResult2 = false;
			const fixture = lambdaHandler((event, context, callback) => {
				callback(null, testResult1);
				return testResult2
			});

			return fixture({}, testContext, (err, result) => {
				expect(err).to.not.exist
				expect(result).to.be.equal(testResult1);
			});
		});
	});

	describe('context', function() {
		it('should have log property defined', function() {
			const fixture = lambdaHandler((event, context) => {
				expect(context).to.have.property('log');
				expect(context.log).to.be.an.instanceof(bunyan);
			});

			return fixture({}, testContext, err => {
				if (err) throw err;
			});
		});

		it('should have child property defined', function() {
			const fixture = lambdaHandler((event, context) => {
				expect(context).to.have.property('child');
				expect(context.child).to.be.a('function');
			});

			return fixture({}, testContext, err => {
				if (err) throw err;
			});
		});
	});
});
