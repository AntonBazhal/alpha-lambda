'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

const lambdaHandler = require('../.');

const noop = () => {};
const testEvent = { answer: 42 };
const testContext = {
	functionName: 'testFunction',
	awsRequestId: '00112233445566778899',
	functionVersion: '$LATEST'
};

describe('lambda-handler-as-promised', function() {

	it('should return a function', function() {
		expect(lambdaHandler()).to.be.a('function');
	});

	it('should have a use() method', function() {
		expect(lambdaHandler())
			.to.have.property('use')
			.that.is.a('function');
	});

	describe('use()', function() {
		it('should throw when middleware is not provided', function() {
			expect(() => lambdaHandler().use()).to.throw(Error, /^middleware is not a function$/);
		});

		it('should throw when midleware is not a function', function() {
			expect(() => lambdaHandler().use(42)).to.throw(Error, /^middleware is not a function$/);
		});

		it('should return the handler', function() {
			const handler = lambdaHandler();
			const result = handler.use(noop);

			expect(result).to.deep.equal(handler);
		});
	});

	describe('handler', function() {
		it('returns a promise', function() {
			const fixture = lambdaHandler().use(noop);
			expect(fixture({}, testContext, noop)).to.be.an.instanceof(Promise);
		});

		it('calls success callback when plain value is returned', function(done) {
			const testResult = true;
			const fixture = lambdaHandler().use(() => testResult);

			fixture({}, testContext, (err, result) => {
				try {
					expect(err).to.not.exist;
					expect(result).to.equal(testResult);
					done();
				} catch (assertErr) {
					done(assertErr);
				}
			});
		});

		it('calls success callback when resolved promise is returned', function(done) {
			const testResult = true;
			const fixture = lambdaHandler().use(() => Promise.resolve(testResult));

			fixture({}, testContext, (err, result) => {
				try {
					expect(err).to.not.exist;
					expect(result).to.equal(testResult);
					done();
				} catch (assertErr) {
					done(assertErr);
				}
			});
		});

		it('calls error callback when rejected promise is returned', function(done) {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler().use(() => Promise.reject(testError));

			fixture({}, testContext, (err, result) => {
				try {
					expect(err).to.deep.equal(testError);
					expect(result).to.not.exist;
					done();
				} catch (assertErr) {
					done(assertErr);
				}
			});
		});

		it('calls error callback when exception is thrown', function(done) {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler().use(() => {
				throw testError;
			});

			fixture({}, testContext, (err, result) => {
				try {
					expect(err).to.deep.equal(testError);
					expect(result).to.not.exist;
					done();
				} catch (assertErr) {
					done(assertErr);
				}
			});
		});

		it('provides middleware with event', function() {
			const middleware = sinon.mock()
				.withArgs(testEvent);

			const fixture = lambdaHandler().use(middleware);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					middleware.verify();
				});
		});

		it('provides middleware with context', function() {
			const middleware = sinon.mock()
				.withArgs(sinon.match.any, sinon.match(testContext));

			const fixture = lambdaHandler().use(middleware);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					middleware.verify();
				});
		});

		it('provides middleware with next', function() {
			const middleware = sinon.mock()
				.withArgs(sinon.match.any, sinon.match.any, sinon.match.func);

			const fixture = lambdaHandler().use(middleware);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					middleware.verify();
				});
		});

		it('chains middleware', function() {
			const spy = sinon.spy(function(event, contex, next) {
				return next();
			});
			const mock = sinon.mock()
				.withArgs(sinon.match.any, sinon.match.any, sinon.match.func);

			const fixture = lambdaHandler().use(spy).use(mock);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					expect(spy.calledOnce).to.be.true;
					mock.verify();
				});
		});

		it('lets middleware catch errors', function() {
			const stub = sinon.stub();
			const catcher = (event, contex, next) => {
				return next().catch(stub);
			};
			const thrower = () => {
				throw new Error();
			};

			const fixture = lambdaHandler().use(catcher).use(thrower);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					expect(stub.called).to.be.true;
				});
		});

		it('middleware can cause error via next', function(done) {
			const testError = new Error();
			const spy = sinon.spy(function(event, context, next) {
				return next(testError);
			});
			const stub = sinon.stub();

			const fixture = lambdaHandler().use(spy).use(stub);

			fixture(testEvent, testContext, (err, result) => {
				try {
					expect(err).to.deep.equal(testError);
					expect(result).to.not.exist;
					expect(stub.called).to.be.false;
					done();
				} catch (assertErr) {
					done(assertErr);
				}
			});
		});

	});

	it('middleware can provide a new context via next', function() {
		const newTestContext = Object.assign({ extra: true }, testContext);
		const newContext = (event, context, next) => {
			return next(null, newTestContext);
		};
		const mock = sinon.mock()
			.withArgs(sinon.match.any, sinon.match(newTestContext));

		const fixture = lambdaHandler().use(newContext).use(mock);

		return fixture(testEvent, testContext, noop)
			.then(() => {
				mock.verify();
			});
	});

	it('middleware can call next() beyond the chain', function() {
		const spy = sinon.spy(function(event, context, next) {
			return next();
		});

		const fixture = lambdaHandler().use(spy);

		return fixture(testEvent, testContext, noop)
			.then(() => {
				expect(spy.calledOnce).to.be.true;
			});
	});

});
