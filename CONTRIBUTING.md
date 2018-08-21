# How to Contribute

The best way to get started is to read through the `Getting Started` and `Example`
sections before having a look through the open [issues](https://github.com/js-platform/filer/issues).
Some of the issues are marked as `good first bug`, but feel free to contribute to
any of the issues there, or open a new one if the thing you want to work on isn't
there yet. If you would like to have an issue assigned to you, please send me a
message and I'll update it.

## Setup

To get a working build system do the following:

```
npm install
```

You can now run the following `npm` scripts:

* `npm run lint` or `npm run eslint` will run `eslint` on the `src` and `tests` directories.
* `npm run lint:fix` or `npm run eslint:fix` will run `eslint` with `--fix` on the `src` and `tests` directories, automatically fixing minor issues.
* `npm run test:manual` will build the tests, and allow you to run them in a browser manually by loading http://localhost:1234.
* `npm run karma-mocha` will build Filer and the tests, and finally run the tests in a headless Chrome browser.
* `npm test` will run `lint` followed by `karma-chrome`, and is what we do on Travis.
* `npm run build` will bundle two versions of Filer: `dist/filer.js` (unminified) and `dist/filer.min.js` (minified) as well as source map files.


Once you've done some hacking and you'd like to have your work merged, you'll need to
make a pull request. If you're patch includes code, make sure to check that all the
unit tests pass, including any new tests you wrote. Finally, make sure you add yourself
to the `AUTHORS` file.

=======
## Tests

Tests are writting using [Mocha](http://visionmedia.github.io/mocha/) and [Chai](http://chaijs.com/api/bdd/).
You can run the tests in your browser by running `npm test` and opening your browser to `http://localhost:1234`.

There are a number of configurable options for the test suite, which are set via query string params.
First, you can choose which filer source to use (i.e., src/, dist/filer-test.js, dist/filer.js or dist/filer.min.js).
The default is to use what is in /dist/filer-test.js, and you can switch to other versions like so:
* tests/index.html?filer-dist/filer.js
* tests/index.html?filer-dist/filer.min.js
* tests/index.html?filer-src/filer.js (from src)

Second, you can specify which provider to use for all non-provider specific tests (i.e., most of the tests).
The default provider is `Memory`, and you can switch it like so:
* tests/index.html?filer-provider=memory
* tests/index.html?filer-provider=indexeddb
* tests/index.html?filer-provider=websql

If you're writing tests, make sure you write them in the same style as existing tests, which are
provider agnostic. See `tests/lib/test-utils.js` and how it gets used in various tests as
an example.

## Communication

If you'd like to talk to someone about the project, you can reach us on irc.mozilla.org in the #filer or #mofodev channel. Look for "ack" or "humph".
