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
* `grunt test` or `grunt test-node` will run [JSHint](http://www.jshint.com/) on your code and the test suite in the context of `nodejs`
* `grunt test-browser` will run [JSHint](http://www.jshint.com/) and start a localhost server on port `1234`. Navigating to `localhost:1234/tests/index.html` will run the test suite in the context of the browser. **NOTE:** When finished, you will have to manually shut off the server by pressing `cmd/ctrl`+`c` in the same terminal session you ran `grunt test-browser`.

Once you've done some hacking and you'd like to have your work merged, you'll need to
make a pull request. If you're patch includes code, make sure to check that all the
unit tests pass, including any new tests you wrote. Finally, make sure you add yourself
to the `AUTHORS` file.

=======
### Releasing a new version
=======
### Releasing a new version
**NOTE:** This step should only ever be attempted by the owner of the repo (@modeswitch).

`grunt publish` will:

* Run the `grunt release` task
* Bump `bower.json` & `package.json` version numbers according to a [Semver](http://semver.org/) compatible scheme (see "How to Publish" below)
* Create a git tag at the new version number
* Create a release commit including `dist/filer.js`, `dist/filer.min.js`, `bower.json` and `package.json`
* Push tag & commit to `origin/develop`
* Update the `gh-pages` branch with the contents of the `develop` branch
* Force push the `gh-pages` branch to `origin/gh-pages`
* Publish the new version of the module to NPM

#### How to configure
1. Copy `env.sample` to `.env`
2. Modify as needed, or leave alone for defaults

#### How to Publish
`grunt publish` can be run in four ways:

1.  `grunt publish` - does a patch (x.x.X) bump
2.  `grunt publish:patch` - also does a patch (x.x.X) bump
3.  `grunt publish:minor` - does a minor (x.X.x) bump
4.  `grunt publish:major` - does a major (X.x.x) bump

The user *must* be on their local `develop` branch before running any form of `grunt publish`, or else the task will fail loudly.

=======
## Tests

Tests are writting using [Mocha](http://visionmedia.github.io/mocha/) and [Chai](http://chaijs.com/api/bdd/).
You can run the tests in your browser by running `grunt test-browser` and opening the `tests` directory @ `http://localhost:1234/tests`.

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
