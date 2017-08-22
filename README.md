# alpha-lambda

[![Build Status][ci-image]][ci-url]
[![Coverage Status][coverage-image]][coverage-url]
[![NPM version][npm-image]][npm-url]
[![Dependencies Status][dependencies-image]][dependencies-url]
[![DevDependencies Status][devdependencies-image]][devdependencies-url]

Tiny wrapper that ensures that [AWS Lambda][aws-lambda-url] function's callback is always called. In other words, from your handler you can return value, promise, throw exception, and this library will wrap your code into a promise while calling appropriate lambda-required callback. Your handler is composed of middleware, similar to [Express][express-url] or [Koa][koa-url].

## Installation

```bash
$ npm install alpha-lambda
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

With `alpha-lambda` you should not worry about top-level error handling, so you can write your handlers just like this:

```js
const alphaLambda = require('alpha-lambda');

module.exports.handler = alphaLambda()
	.use(function(event, context, next) {
		console.log('this runs first');
		doSomethingSync();
		return next(); // next is a function, you must call it to proceed to next middleware
	})
	.use(function(event, context) {
		console.log('then this runs');
		return doSomethingThatReturnsAPromise()
			.then(() => {
				// this would be the result of your lambda invoke
				return true;
			});
	});
```

## Error Handling

If you need custom error handling, you can do this by adding error handler as one of the first middleware, like:

```js
const alphaLambda = require('alpha-lambda');
const co = require('co');

module.exports.handler = alphaLambda()
	.use(function(event, context, next) {
		// Promise based error handler
		return next()
			.catch(err => {
				// re throw, return Promise, etc.
			});
	})
	.use(co.wrap(function* (event, context, next) {
		// generator based error handler
		try {
			yield next();
		} catch (err) {
			// re throw, return Promise, etc.
		}
	})
	.use(function(event) {
		// normal workflow
		return doSomething(event);
	});
```

## Middleware

Use these middleware to extend functionality.

| Middleware | Author |
|:-------|:------:|
| **[Bunyan Logger][alpha-lambda-bunyan-url]** <br/> Bunyan logger middleware for alpha-lambda | [Anton Bazhal][anton-bazhal-url] |

## License

The MIT License (MIT)

Copyright (c) 2016-2017 Anton Bazhal

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[anton-bazhal-url]: https://github.com/AntonBazhal
[aws-context-url]: http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
[aws-lambda-url]: https://aws.amazon.com/lambda/details/
[bunyan-log-child-url]: https://www.npmjs.com/package/bunyan#logchild
[bunyan-url]: https://www.npmjs.com/package/bunyan
[ci-image]: https://circleci.com/gh/AntonBazhal/alpha-lambda.svg?style=shield&circle-token=fc9c3e6f415d2d338800c8a08d6155708ad260ce
[ci-url]: https://circleci.com/gh/AntonBazhal/alpha-lambda
[coverage-image]: https://coveralls.io/repos/github/AntonBazhal/alpha-lambda/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/AntonBazhal/alpha-lambda?branch=master
[dependencies-url]: https://david-dm.org/antonbazhal/alpha-lambda
[dependencies-image]: https://david-dm.org/antonbazhal/alpha-lambda/status.svg
[devdependencies-url]: https://david-dm.org/antonbazhal/alpha-lambda?type=dev
[devdependencies-image]: https://david-dm.org/antonbazhal/alpha-lambda/dev-status.svg
[express-url]: https://expressjs.com/
[koa-url]: http://koajs.com/
[alpha-lambda-bunyan-url]: https://www.npmjs.com/package/alpha-lambda-bunyan
[npm-url]: https://www.npmjs.org/package/alpha-lambda
[npm-image]: https://img.shields.io/npm/v/alpha-lambda.svg
