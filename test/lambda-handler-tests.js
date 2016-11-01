'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const lambdaHandler = require('../.');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('lambda-handler-as-promised', function() {

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
		expect(fixture()).eventually.be.an.instanceof(Promise);
	});

	it('wrapped handler should call success callback when plain value is returned', function() {
		const testResult = true;
		const fixture = lambdaHandler(() => testResult);

		return fixture({}, {}, (err, result) => {
			expect(err).to.not.exist;
			expect(result).to.equal(testResult);
		});
	});

	it('wrapped handler should call success callback when resolved promise is returned', function() {
		const testResult = true;
		const fixture = lambdaHandler(() => Promise.resolve(testResult));

		return fixture({}, {}, (err, result) => {
			expect(err).to.not.exist;
			expect(result).to.equal(testResult);
		});
	});

	it('wrapped handler should call success callback when success callback is called by handler', function() {
		const testResult = true;
		const fixture = lambdaHandler((event, context, callback) => callback(null, testResult));

		return fixture({}, {}, (err, result) => {
			expect(err).to.not.exist;
			expect(result).to.equal(testResult);
		});
	});

	it('wrapped handler should call error callback when rejected promise is returned', function() {
		const testError = new Error('Winter is coming!');
		const fixture = lambdaHandler(() => Promise.reject(testError));

		return fixture({}, {}, (err, result) => {
			expect(err).to.deep.equal(testError);
			expect(result).to.not.exist;
		});
	});

	it('wrapped handler should call error callback when exception is thrown', function() {
		const testError = new Error('Winter is coming!');
		const fixture = lambdaHandler(() => {
			throw testError;
		});

		return fixture({}, {}, (err, result) => {
			expect(err).to.deep.equal(testError);
			expect(result).to.not.exist;
		});
	});

	it('wrapped handler should call error callback when error callback is called by handler', function() {
		const testError = new Error('Winter is coming!');
		const fixture = lambdaHandler((event, context, callback) => callback(testError));

		return fixture({}, {}, (err, result) => {
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

		return fixture({}, {}, (err, result) => {
			expect(err).to.not.exist
			expect(result).to.be.equal(testResult1);
		});
	});
});
