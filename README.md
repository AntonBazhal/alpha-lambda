# lambda-handler-as-promised

[![Build Status][ci-image]][ci-url]
[![Coverage Status][coverage-image]][coverage-url]
[![NPM version][npm-image]][npm-url]
[![Dependencies Status][dependencies-image]][dependencies-url]
[![DevDependencies Status][devdependencies-image]][devdependencies-url]

Tiny wrapper that ensures that [AWS Lambda][aws-lambda-url] function's callback is always called. In other words, from your handler you can return value, promise, throw exception, and this library will wrap your code into a promise while calling appropriate lambda-required callback. If you’d like, you can call callback by yourself, `lambda-handler-as-promised` will still behave in the same way.

## Installation

```bash
$ npm install lambda-handler-as-promised
```

## Usage

If you do things in a usual way, you'll construct your lambda handlers similar to this:

```js
const handler = function(event, context, callback) {
	try {
		const result = doSomething(event);

		if (result) {
			callback(null, result);
		} else {
			callback(new Error('Winter is coming!'));
		}
	} catch (err) {
		callback(err);
	}
}
```

With `lambda-handler-as-promised` you should not worry about top-level error handling, so you can write your handlers just like this:

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(function(event) {
	const result = doSomething(event);

	if (/*something wrong*/) {
		throw new Error('Winter is coming!');
	}

	return result;
});
```

Or like this:

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(function(event) {
	if (/*something wrong*/) {
		throw new Error('Winter is coming!');
	}

	return doSomethingPromise(event);
});
```

Or this (if you really want to):

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(function(event, context, callback) {
	const result = doSomething(event);

	if (result) {
		callback(null, result);
	} else {
		callback(new Error('Winter is coming!'));
	}
});
```

> Note: handler, created by `lambda-handler-as-promised`, returns Promise.

## Configuration

`lambda-handler-as-promised` accepts an optional configuration object as a second parameter.

### options.errorStack

If set to `false`, error's stack trace is removed before returning error to a caller. Defaults to `false`.

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(
	function(event) {
		throw new Error('Winter is coming!');
	},
	{
		errorStack: false
	}
);
```

### options.onBefore(event, context)

Lifecycle hook method that is called before [`handler`](#usage).

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(
	function(event) {
		throw new Error('Winter is coming!');
	},
	{
		onBefore: function(event, context) {
			context.log.info({ event }, 'processing event');
		}
	}
);
```

### options.onAfter(result, event, context)

Lifecycle hook method that is called before result is returned to a caller. If no value is returned, original result will be passed back.

> Note: if error is thrown inside this hook method, `options.onError` hook will be called when provided

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(
	function(event) {
		throw new Error('Winter is coming!');
	},
	{
		onAfter: function(result, event, context) {
			context.log.info({ result }, 'event processed');
			return {
				code: 200,
				body: result
			};
		}
	}
);
```

### options.onError(error, event, context)

Lifecycle hook method that is called when error is thrown during event processing. This method should be treated as a `catch` block. In other words, if you'd like error to be returned to a caller as an error, it must be rethrown. If error is not rethrown, `lambda-handler-as-promised` will pass back value returned from the hook or original error (when no value is returned) to a success callback.

> Note: if error is not rethrown, `options.onAfter` hook will be called when provided

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(
	function(event) {
		throw new Error('Winter is coming!');
	},
	{
		onError: function(error, event, context) {
			if (/*is critical error*/) {
				context.log.error({ result }, 'error occurred');
				throw error;
			}

			return error;
		}
	}
);
```

## Context Extensions

`lambda-handler-as-promised` adds several useful extensions to the [context][aws-context-url] object.

### context.log

`context.log` is a [bunyan][bunyan-url] instance initialized with such properties:
- **name**: name of the [AWS Lambda][aws-lambda-url] function
- **level**: logging level taken from `LOG_LEVEL` environment variable; `info` by default (check [bunyan documentation][bunyan-url] for more information)
- **awsRequestId**: [AWS request ID][aws-context-url] associated with the request
- **functionVersion**: the [AWS Lambda][aws-lambda-url] function version that is executing
- **serializers**: custom serializers for `err` / `error` object (based on `bunyan.stdSerializers.err`, but custom error fields, if present, are included as well), and `context` object (to prevent `log` and `child` properties from being logged)

```js
const lambdaHandler = require('lambda-handler-as-promised');

const handler = lambdaHandler(function(event, context) {
	context.log.info('Lambda function was invoked!');
	return true;
});
```

### context.child

`context.child` method provides a way to create child logger with additional bound fields to be included into log records. Please note, that original context is cloned, so it is not mutated. This method is based on [bunyan's log.child method][bunyan-log-child-url].

```js
const lambdaHandler = require('lambda-handler-as-promised');

function doSomething(context) {
	context = context.child({ newField: 'new' }); // newField will be added to all log records
	context.log.info('This is child context with newField');
}

const handler = lambdaHandler(function(event, context) {
	context.log.info('This is base context');
	doSomething();
	context.log.info('This is base context again');
	return true;
});
```

## License

The MIT License (MIT)

Copyright (c) 2016-2017 Anton Bazhal

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[aws-context-url]: http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
[aws-lambda-url]: https://aws.amazon.com/lambda/details/
[bunyan-log-child-url]: https://www.npmjs.com/package/bunyan#logchild
[bunyan-url]: https://www.npmjs.com/package/bunyan
[ci-image]: https://circleci.com/gh/AntonBazhal/lambda-handler-as-promised.svg?style=shield&circle-token=fc9c3e6f415d2d338800c8a08d6155708ad260ce
[ci-url]: https://circleci.com/gh/AntonBazhal/lambda-handler-as-promised
[coverage-image]: https://coveralls.io/repos/github/AntonBazhal/lambda-handler-as-promised/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/AntonBazhal/lambda-handler-as-promised?branch=master
[dependencies-url]: https://david-dm.org/antonbazhal/lambda-handler-as-promised
[dependencies-image]: https://david-dm.org/antonbazhal/lambda-handler-as-promised/status.svg
[devdependencies-url]: https://david-dm.org/antonbazhal/lambda-handler-as-promised?type=dev
[devdependencies-image]: https://david-dm.org/antonbazhal/lambda-handler-as-promised/dev-status.svg
[npm-url]: https://www.npmjs.org/package/lambda-handler-as-promised
[npm-image]: https://img.shields.io/npm/v/lambda-handler-as-promised.svg
