const {expect} = require('chai');
const sinon = require('sinon');

const lambdaHandler = require('../.');

const noop = () => {};
const testEvent = {answer: 42};
const testContext = {
	functionName: 'testFunction',
	awsRequestId: '00112233445566778899',
	functionVersion: '$LATEST'
};

describe('handler', () => {
	it('should return a function', () => {
		expect(lambdaHandler()).to.be.a('function');
	});

	it('should have a use() method', () => {
		expect(lambdaHandler())
			.to.have.property('use')
			.that.is.a('function');
	});

	describe('use()', () => {
		it('should throw when middleware is not provided', () => {
			expect(() => lambdaHandler().use()).to.throw(Error, /^middleware is not a function$/);
		});

		it('should throw when midleware is not a function', () => {
			expect(() => lambdaHandler().use(42)).to.throw(Error, /^middleware is not a function$/);
		});

		it('should return the handler', () => {
			const handler = lambdaHandler();
			const result = handler.use(noop);

			expect(result).to.deep.equal(handler);
		});
	});

	describe('handler', () => {
		it('returns a promise', () => {
			const fixture = lambdaHandler().use(noop);
			expect(fixture({}, testContext)).to.be.an.instanceof(Promise);
		});

		it('succeeds when plain value is returned', async () => {
			const testResult = true;
			const fixture = lambdaHandler().use(() => testResult);

			const result = await fixture({}, testContext);
			expect(result).to.equal(testResult);
		});

		it('succeeds when resolved promise is returned', async () => {
			const testResult = true;
			const fixture = lambdaHandler().use(() => Promise.resolve(testResult));

			const result = await fixture({}, testContext);
			expect(result).to.equal(testResult);
		});

		it('throws error when rejected promise is returned', async () => {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler().use(() => Promise.reject(testError));

			try {
				await fixture({}, testContext);
			} catch (error) {
				expect(error).to.deep.equal(testError);
			}
		});

		it('throws error when exception is thrown', async () => {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler().use(() => {
				throw testError;
			});

			try {
				await fixture({}, testContext);
			} catch (error) {
				expect(error).to.deep.equal(testError);
			}
		});

		it('provides middleware with event', () => {
			const middleware = sinon.mock()
				.withArgs(testEvent);

			const fixture = lambdaHandler().use(middleware);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					middleware.verify();
				});
		});

		it('provides middleware with context', () => {
			const middleware = sinon.mock()
				.withArgs(sinon.match.any, sinon.match(testContext));

			const fixture = lambdaHandler().use(middleware);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					middleware.verify();
				});
		});

		it('provides middleware with next', () => {
			const middleware = sinon.mock()
				.withArgs(sinon.match.any, sinon.match.any, sinon.match.func);

			const fixture = lambdaHandler().use(middleware);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					middleware.verify();
				});
		});

		it('chains middleware', () => {
			const spy = sinon.spy((event, contex, next) => {
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

		it('lets middleware catch errors', () => {
			const stub = sinon.stub();
			const catcher = (event, contex, next) => {
				return next().catch(stub);
			};

			const thrower = () => {
				throw new Error('Winter is coming!');
			};

			const fixture = lambdaHandler().use(catcher).use(thrower);

			return fixture(testEvent, testContext, noop)
				.then(() => {
					expect(stub.called).to.be.true;
				});
		});

		it('middleware can cause error via next', async () => {
			const testError = new Error('Winter is coming!');
			const spy = sinon.spy((event, context, next) => {
				return next(testError);
			});
			const stub = sinon.stub();

			const fixture = lambdaHandler().use(spy).use(stub);

			try {
				await fixture(testEvent, testContext);
			} catch (error) {
				expect(error).to.deep.equal(testError);
				expect(stub.called).to.be.false;
			}
		});
	});

	it('middleware can provide a new context via next', () => {
		const newTestContext = Object.assign({extra: true}, testContext);
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

	it('middleware can call next() beyond the chain', () => {
		const spy = sinon.spy((event, context, next) => {
			return next();
		});

		const fixture = lambdaHandler().use(spy);

		return fixture(testEvent, testContext, noop)
			.then(() => {
				expect(spy.calledOnce).to.be.true;
			});
	});

	it('middleware provide a new event from next()', () => {
		const spy = sinon.spy();

		const fixture = lambdaHandler()
			.use((event, context, next) => {
				return next(null, null, 'test');
			})
			.use(spy);

		return fixture(testEvent, testContext, noop)
			.then(() => {
				expect(spy.calledOnce).to.be.true;
				expect(spy.firstCall.args[0]).to.equal('test');
			});
	});
});
