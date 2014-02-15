# How to Contribute

The best way to get started is to read through the `Getting Started` and `Example`
sections before having a look through the open [issues](https://github.com/js-platform/filer/issues).
Some of the issues are marked as `good first bug`, but feel free to contribute to
any of the issues there, or open a new one if the thing you want to work on isn't
there yet. If you would like to have an issue assigned to you, please send me a
message and I'll update it.

## Setup

The Filer build system is based on [grunt](http://gruntjs.com/). To get a working build system
do the following:

```
npm install
npm install -g grunt-cli
```

You can now run the following grunt tasks:
* `grunt check` will run [JSHint](http://www.jshint.com/) on your code (do this before submitting a pull request) to catch errors
* `grunt develop` will create a single file version of the library for testing in `dist/idbfs.js`
* `grunt release` like `develop` but will also create a minified version of the library in `dist/idbfs.min.js`
* `grunt test` will run [JSHint](http://www.jshint.com/) on your code and the test suite in [PhantomJS](http://phantomjs.org/)

Once you've done some hacking and you'd like to have your work merged, you'll need to
make a pull request. If you're patch includes code, make sure to check that all the
unit tests pass, including any new tests you wrote. Finally, make sure you add yourself
to the `AUTHORS` file.

## Tests

Tests are writting using [Mocha](http://visionmedia.github.io/mocha/) and [Chai](http://chaijs.com/api/bdd/).
You can run the tests in your browser by opening the `tests` directory. You can also run them
[here](http://js-platform.github.io/filer/tests/).

There are a number of configurable options for the test suite, which are set via query string params.
First, you can choose which filer source to use (i.e., src/, dist/filer.js or dist/filer.min.js).
The default is to use what is in /src, and you can switch to built versions like so:
* tests/index.html?filer-dist/filer.js
* tests/index.html?filer-dist/filer.min.js

Second, you can specify which provider to use for all non-provider specific tests (i.e., most of the tests).
The default provider is `Memory`, and you can switch it like so:
* tests/index.html?filer-provider=memory
* tests/index.html?filer-provider=indexeddb
* tests/index.html?filer-provider=websql

If you're writing tests, make sure you write them in the same style as existing tests, which are
provider agnostic. See `tests/lib/test-utils.js` and how it gets used in various tests as
an example.

## Communication

If you'd like to talk to someone about the project, you can reach us on irc.mozilla.org in the
#filer or #mofodev channel. Look for "ack" or "humph".
