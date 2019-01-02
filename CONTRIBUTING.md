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

Next, make sure you have installed Chrome and Firefox, which are needed for
running headless versions of the tests with `npm test`.

## Tests

Tests are written using [Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/api/bdd/).
There are a number of ways to run the tests.  The preferred way is:

```
npm test
```

This will do a build, run the linting, start a server, and load the tests into
headless versions of Chrome and Firefox.

If you want more control over how tests are run, you can use other scripts:

* Linting is done via `npm run lint` or `npm run eslint`, both of which will run `eslint` on the `src` and `tests` directories.  You can also use `npm run lint:fix` or `npm run eslint:fix`, which will run `eslint` with `--fix` on the `src` and `tests` directories, automatically fixing minor issues.  Linting is run by default as part of `npm test`

* In headless versions of Chrome and Firefox using `npm test`.  A report at the end will tell you what happened with each browser.  Browser tests are preferred because they also test our providers (e.g., IndexedDB).  They do take longer to run.  You can also use `npm run karma-mocha-firefox` or `npm run karma-mocha-chrome` to run the tests in only one of the two headless browsers.

* In node.js using the Memory provider using `npm run test:node`.  These run much faster, but don't run all tests (e.g., providers, watches).

* If you need to debug browser tests, or want to run them in a different browser, use `npm run test:manual`, which will start a server and you can point your browser to [http://localhost:1234](http://localhost:1234).  Running the tests this way will also automatically watch your files, and hot-reload your code and tests, which is useful for debugging and trial/error testing.

* If you need to debug node.js test runs, you can do so using `npm run test:node-debug`.  Then, open Chrome and browse to [chrome://inspect](chrome://inspect) and click on your tests in the inspector.  The easiest way to get a breakpoint is to manually add a `debugger` keyword to your test code where you want the tests to stop.

> Tip: you can add `skip()` to any `it()` or `describe()` in Mocha to skip a test, or `only()` to have only that test run.  For example: `describe.skip(...)` or `it.only(...)`.

* If you want to run migration tests separate from unit tests, use `npm run test:migrations`.  Migration tests run at the end of a typical `npm test` run.  If you need to create a new migration test, see [`tools/fs-image.js`](tools/fs-image.js) for details on how to generate a filesystem image, and [tests/filesystems/images/README.md](tests/filesystems/images/README.md) for more docs.

* If you want to manually generate coverage info for the tests, use `npm run coverage`.  This is done automatically in Travis, so you shouldn't need to do it.  You can see [https://codecov.io/gh/filerjs/filer](https://codecov.io/gh/filerjs/filer) for detailed reports.

There are a number of configurable options for the test suite, which are set via query string params.
First, you can choose which filer source to use (i.e., src/, dist/filer-test.js, dist/filer.js or dist/filer.min.js). The default is to use what is in /dist/filer-test.js, and you can switch to other versions like so:

* tests/index.html?filer-dist/filer.js
* tests/index.html?filer-dist/filer.min.js
* tests/index.html?filer-src/filer.js (from src)

Second, you can specify which provider to use for all non-provider specific tests (i.e., most of the tests).
The default provider is `Memory`, and you can switch it like so:

* tests/index.html?filer-provider=memory
* tests/index.html?filer-provider=indexeddb

If you're writing tests, make sure you write them in the same style as existing tests, which are
provider agnostic. See [`tests/lib/test-utils.js`](tests/lib/test-utils.js) and how it gets used
in various tests as an example.

## Releases

In order to perform a release, you'll need commit access to the main Filer repo,
as well as access to publish to Filer's npm module.  To do a release:

1. Make sure you have a .env file, with your `GITHUB_TOKEN` included.  See [`env.sample`](env.sample) for more info on how to create one.
1. Login to the `npm` registry if you haven't already using `npm login`
1. Run `npm run release`.  Releases are done interactively using [release-it](https://www.npmjs.com/package/release-it), and our config is defined in [`.release-it.json`](.release-it.json).
