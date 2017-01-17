'use strict';

const bunyan = require('bunyan');
const expect = require('chai').expect;

const lambdaHandler = require('../.');

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
			expect(fixture({}, testContext, () => {})).to.be.an.instanceof(Promise);
		});

		it('wrapped handler should call success callback when plain value is returned', function(done) {
			const testResult = true;
			const fixture = lambdaHandler(() => testResult);

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

		it('wrapped handler should call success callback when resolved promise is returned', function(done) {
			const testResult = true;
			const fixture = lambdaHandler(() => Promise.resolve(testResult));

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

		it('wrapped handler should call success callback when success callback is called by handler', function(done) {
			const testResult = true;
			const fixture = lambdaHandler((event, context, callback) => callback(null, testResult));

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

		it('wrapped handler should call error callback when rejected promise is returned', function(done) {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler(() => Promise.reject(testError));

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

		it('wrapped handler should call error callback when exception is thrown', function(done) {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler(() => {
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

		it('wrapped handler should call error callback when error callback is called by handler', function(done) {
			const testError = new Error('Winter is coming!');
			const fixture = lambdaHandler((event, context, callback) => callback(testError));

			fixture({}, testContext, (err, result) => {
				try {
					expect(err).to.have.property('message', testError.message);
					expect(result).to.not.exist;
					done();
				} catch (assertErr) {
					done(assertErr);
				}
			});
		});

		it('wrapped handler should use callback value when both callback is called and value is returned', function(done) {
			const testResult1 = true;
			const testResult2 = false;
			const fixture = lambdaHandler((event, context, callback) => {
				callback(null, testResult1);
				return testResult2;
			});

			fixture({}, testContext, (err, result) => {
				try {
					expect(err).to.not.exist;
					expect(result).to.be.equal(testResult1);
					done();
				} catch (assertErr) {
					done(assertErr);
				}
			});
		});
	});

	describe('options', function() {
		describe('hooks', function() {
			describe('onBefore', function() {
				it('should throw when "onBefore" is not a function', function() {
					expect(() => lambdaHandler(() => {}, { onBefore: {} }))
						.to.throw(Error, /^options.onBefore must be a function when present$/);
				});

				it('should call "onBefore" hook when passed', function(done) {
					const testEvent = { data: 'some extremely important data' };
					const fixture = lambdaHandler(
						() => true,
						{
							onBefore: (event, context) => {
								expect(event).to.be.deep.equal(testEvent);
								expect(context).to.have.property('awsRequestId', testContext.awsRequestId);
								expect(context).to.have.property('log');
							}
						}
					);

					fixture(testEvent, testContext, done);
				});

				it('should call "onError" hook when error is thrown in "onBefore"', function(done) {
					let errHookCallCount = 0;
					const testError = new Error('Winter is coming!');
					const fixture = lambdaHandler(
						() => true,
						{
							onBefore: () => { throw testError; },
							onError: err => {
								expect(err).to.be.deep.equal(testError);
								errHookCallCount++;
								throw err;
							}
						}
					);

					fixture({}, testContext, err => {
						try {
							expect(err).to.be.deep.equal(testError);
							expect(errHookCallCount).to.equal(1);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});
			});

			describe('onAfter', function() {
				it('should throw when "onAfter" is not a function', function() {
					expect(() => lambdaHandler(() => {}, { onAfter: {} }))
						.to.throw(Error, /^options.onAfter must be a function when present$/);
				});

				it('should call "onAfter" hook when passed', function(done) {
					const testEvent = { data: 'some extremely important data' };
					const testResult = { response: 'some useful info' };
					const fixture = lambdaHandler(
						() => testResult,
						{
							onAfter: (result, event, context) => {
								expect(result).to.be.deep.equal(testResult);
								expect(event).to.be.deep.equal(testEvent);
								expect(context).to.have.property('awsRequestId', testContext.awsRequestId);
								expect(context).to.have.property('log');
							}
						}
					);

					fixture(testEvent, testContext, done);
				});

				it('should use value returned by "onAfter" as a result', function(done) {
					const modifiedResult = { modifiedResponse: 'some modified info' };
					const fixture = lambdaHandler(
						() => true,
						{ onAfter: () => modifiedResult }
					);

					fixture({}, testContext, (err, result) => {
						try {
							expect(result).to.deep.equal(modifiedResult);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});

				it('should use value returned by "onAfter" as a result when value is falsy', function(done) {
					const modifiedResult = false;
					const fixture = lambdaHandler(
						() => true,
						{ onAfter: () => modifiedResult }
					);

					fixture({}, testContext, (err, result) => {
						try {
							expect(result).to.deep.equal(modifiedResult);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});

				it('should use original result when "onAfter" does not return any value', function(done) {
					const testResult = { response: 'some useful info' };
					const fixture = lambdaHandler(
						() => testResult,
						{ onAfter: () => {} }
					);

					fixture({}, testContext, (err, result) => {
						try {
							expect(result).to.deep.equal(testResult);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});

				it('should call "onError" hook when error is thrown in "onAfter"', function(done) {
					let errHookCallCount = 0;
					const testError = new Error('Winter is coming!');
					const fixture = lambdaHandler(
						() => true,
						{
							onAfter: () => { throw testError; },
							onError: err => {
								expect(err).to.be.deep.equal(testError);
								errHookCallCount++;
								throw err;
							}
						}
					);

					fixture({}, testContext, err => {
						try {
							expect(err).to.be.deep.equal(testError);
							expect(errHookCallCount).to.equal(1);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});
			});

			describe('onError', function() {
				it('should throw when "onError" is not a function', function() {
					expect(() => lambdaHandler(() => {}, { onError: {} }))
						.to.throw(Error, /^options.onError must be a function when present$/);
				});

				it('should call "onError" hook when passed', function(done) {
					const testEvent = { data: 'some extremely important data' };
					const testError = new Error('Winter is coming!');
					const fixture = lambdaHandler(
						() => { throw testError; },
						{
							onError: (err, event, context) => {
								expect(err).to.be.deep.equal(err);
								expect(event).to.be.deep.equal(testEvent);
								expect(context).to.have.property('awsRequestId', testContext.awsRequestId);
								expect(context).to.have.property('log');
							}
						}
					);

					fixture(testEvent, testContext, done);
				});

				it('should use error thrown by "onError" as an error', function(done) {
					const testError = new Error('Winter is coming!');
					const fixture = lambdaHandler(
						() => { throw new Error(); },
						{ onError: () => { throw testError; } }
					);

					fixture({}, testContext, err => {
						try {
							expect(err).to.deep.equal(testError);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});

				it('should use value returned by "onError" as a result', function(done) {
					const testResult = { testResponse: 'some useful info' };
					const fixture = lambdaHandler(
						() => { throw new Error(); },
						{ onError: () => testResult }
					);

					fixture({}, testContext, (err, result) => {
						try {
							expect(err).to.be.equal(null);
							expect(result).to.deep.equal(testResult);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});

				it('should use value returned by "onError" as a result when value is falsy', function(done) {
					const testResult = false;
					const fixture = lambdaHandler(
						() => { throw new Error(); },
						{ onError: () => testResult }
					);

					fixture({}, testContext, (err, result) => {
						try {
							expect(err).to.be.equal(null);
							expect(result).to.deep.equal(testResult);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});

				it('should return original error when "onError" does not return any value and does not throw', function(done) {
					const testError = new Error('Winter is coming!');
					const fixture = lambdaHandler(
						() => { throw testError; },
						{ onError: () => {} }
					);

					fixture({}, testContext, (err, result) => {
						try {
							expect(err).to.be.equal(null);
							expect(result).to.deep.equal(testError);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});

				it('should call "onAfter" hook when result is returned in "onError"', function(done) {
					let resultHookCallCount = 0;
					const testResult = { testResponse: 'some useful info' };
					const fixture = lambdaHandler(
						() => { throw new Error(); },
						{
							onError: () => testResult,
							onAfter: result => {
								expect(result).to.be.deep.equal(testResult);
								resultHookCallCount++;
							}
						}
					);

					fixture({}, testContext, (err, result) => {
						try {
							expect(err).to.be.equal(null);
							expect(resultHookCallCount).to.equal(1);
							expect(result).to.be.deep.equal(testResult);
							done();
						} catch (assertErr) {
							done(assertErr);
						}
					});
				});
			});
		});

		describe('errorStack', function() {
			it('should throw when "errorStack" is not boolean', function() {
				expect(() => lambdaHandler(() => {}, { errorStack: 'yes' }))
					.to.throw(Error, /^options.errorStack must be a boolean when present$/);
			});

			it('should return error stack by default', function(done) {
				const testError = new Error('Winter is coming!');
				const fixture = lambdaHandler(() => {
					throw testError;
				});

				fixture({}, testContext, err => {
					try {
						expect(err).to.have.property('message', testError.message);
						expect(err).to.have.property('stack', testError.stack);
						done();
					} catch (assertErr) {
						done(assertErr);
					}
				});
			});

			it('should return error stack when "errorStack" is set to true', function(done) {
				const testError = new Error('Winter is coming!');
				const fixture = lambdaHandler(() => {
					throw testError;
				}, { errorStack: true });

				fixture({}, testContext, err => {
					try {
						expect(err).to.have.property('message', testError.message);
						expect(err).to.have.property('stack', testError.stack);
						done();
					} catch (assertErr) {
						done(assertErr);
					}
				});
			});

			it('should sanitize error stack when "errorStack" is set to false', function(done) {
				const testError = new Error('Winter is coming!');
				const fixture = lambdaHandler(() => {
					throw testError;
				}, { errorStack: false });

				fixture({}, testContext, err => {
					try {
						expect(err).to.have.property('message', testError.message);
						expect(err).to.have.property('stack', '');
						done();
					} catch (assertErr) {
						done(assertErr);
					}
				});
			});

			it('should handle case when "errorStack" is set to false, but error does not have "stack" field', function(done) {
				const testError = { message: 'Winter is coming!' };
				const fixture = lambdaHandler(() => {
					throw testError;
				}, { errorStack: false });

				fixture({}, testContext, err => {
					try {
						expect(err).to.have.property('message', testError.message);
						expect(err).not.to.have.property('stack');
						done();
					} catch (assertErr) {
						done(assertErr);
					}
				});
			});
		});
	});

	describe('context', function() {
		it('should have log property defined', function(done) {
			const fixture = lambdaHandler((event, context) => {
				expect(context).to.have.property('log');
				expect(context.log).to.be.an.instanceof(bunyan);
			});

			fixture({}, testContext, done);
		});

		it('should have child property defined', function(done) {
			const fixture = lambdaHandler((event, context) => {
				expect(context).to.have.property('child');
				expect(context.child).to.be.a('function');
			});

			fixture({}, testContext, done);
		});
	});
});
