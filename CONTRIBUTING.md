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
* `grunt jshint` will run [JSHint](http://www.jshint.com/) on your code (do this before submitting a pull request) to catch errors
* `grunt develop` will create a single file version of the library for testing in `dist/filer.js`
* `grunt release` like `develop` but will also create a minified version of the library in `dist/filer.min.js`
* `grunt test` or `grunt test-node` will run [JSHint](http://www.jshint.com/) on your code and the test suite in the context of `nodejs`
* `grunt test-browser` will run [JSHint](http://www.jshint.com/) and start a localhost server on port `1234`. Navigating to `localhost:1234/tests/index.html` will run the test suite in the context of the browser. **NOTE:** When finished, you will have to manually shut off the server by pressing `cmd/ctrl`+`c` in the same terminal session you ran `grunt test-browser`.

Once you've done some hacking and you'd like to have your work merged, you'll need to
make a pull request. If you're patch includes code, make sure to check that all the
unit tests pass, including any new tests you wrote. Finally, make sure you add yourself
to the `AUTHORS` file.

=======
### Releasing a new version
=======

`grunt publish` will:

* Run the `grunt release` task
* Bump `bower.json` & `package.json` version numbers according to a [Semver](http://semver.org/) compatible scheme (see ["How to Publish"](#how-to-publish) below)
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
You can run the tests in your browser by running `grunt test-browser` and opening the `tests` directory @ `http://localhost:1234/tests`, or in a nodejs context by running `grunt test`.

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

## Grunt tasks

The six grunt tasks Filer provides for development are detailed here, including a description of the third party tasks that are used to complete the process in the order they are used. For details on the grunt task running framework, see [http://gruntjs.com/](http://gruntjs.com/).

Individual targets are shown *in italics*:

### 1. grunt develop

*This task is responsible for producing the Filer distribution files.*

#### `browserify` ([https://www.npmjs.org/package/grunt-browserify](https://www.npmjs.org/package/grunt-browserify))

* *:filerDist*: Combines the filer source tree into a single distribution file for the bower releases.

#### `uglify` ([https://www.npmjs.com/package/grunt-contrib-uglify](https://www.npmjs.com/package/grunt-contrib-uglify))

* Adds a banner to ensure every release's distribution files are unique (**NOTE**: This is required for a successful `grunt release`)

### 2. grunt release

*This task runs the `grunt test`, and `grunt develop` tasks in one command, preventing new distribution files from being generated if tests fail.*

### 3. grunt build-tests

*This task generates single-file versions of the test suite and a separate Filer distribution file for testing Filer's compatibility with the [requirejs module system](http://requirejs.og/).*

#### `clean` ([https://www.npmjs.com/package/grunt-contrib-clean](https://www.npmjs.com/package/grunt-contrib-clean))

* Deletes the current browserified test files (see [http://browserify.org/](http://browserify.org/) for more details)

#### `browserify` ([https://www.npmjs.org/package/grunt-browserify](https://www.npmjs.org/package/grunt-browserify))

* *:filerPerf*: Combines performance tests into a single distribution file for browser performance benchmarks
* *:filerTest*: Combines unit tests into a single distribution file for testing Filer in the browser
* *:filerIssue225*: Used to generate a distribution file for testing based on the current state of the code, without affecting the current release's distribution file

### 4. grunt test-node

*This task lints and tests the Filer library in a nodejs context, aborting if any of the subtasks fail.*

#### `jshint` ([https://www.npmjs.com/package/grunt-contrib-jshint](https://www.npmjs.com/package/grunt-contrib-jshint))

* Used to lint the source files.

#### `browserify` ([https://www.npmjs.org/package/grunt-browserify](https://www.npmjs.org/package/grunt-browserify))

* *:filerIssue225*: Used to generate a distribution file for testing based on the current state of the code, without affecting the current release's distribution file

#### `shell` ([https://www.npmjs.com/package/grunt-shell](https://www.npmjs.com/package/grunt-shell))

* *:mocha*: Runs Filer's test suite on nodejs using the mocha test framework from the command line interface

### 5. grunt test-browser

*This task generates all the files necessary for running Filer's test suite in a browser, and starts a simple HTTP server to access the tests from your browser of choice*

#### `jshint` ([https://www.npmjs.com/package/grunt-contrib-jshint](https://www.npmjs.com/package/grunt-contrib-jshint))

* Used to lint the source files.

#### `build-tests` ([#3-grunt-build-tests](#3-grunt-build-tests))

* Generates single-file versions of the test suite and a separate Filer distribution file for testing Filer's compatibility with the [requirejs module system](http://requirejs.og/).

#### `connect` ([https://www.npmjs.com/package/grunt-contrib-connect](https://www.npmjs.com/package/grunt-contrib-connect))

* *:serverForBrowser*: Starts a simple HTTP server pointing at the root of the Filer directory. Browsing to the '/tests/' directory will run the Filer tests in the browser.

### 6. grunt publish

#### `prompt` ([https://www.npmjs.com/package/grunt-prompt](https://www.npmjs.com/package/grunt-prompt))

* *confirm*: Interactive prompt task, used to confirm the kind of version release being requested by the user, and to give them an opportunity to abort the release. The prompt message is generated in the `grunt publish` task itself.

#### `npm-checkbranch` ([https://github.com/sedge/grunt-npm/tree/branchcheck](https://github.com/sedge/grunt-npm/tree/branchcheck))

* Causes `grunt publish` to fail out early if the user is not on the `develop` branch

#### `release` ([#2-grunt-release](#2-grunt-release))

*  Runs the `grunt test`, and `grunt develop` tasks in one command, preventing new distribution files from being generated if tests fail.

#### `bump` ([https://www.npmjs.com/package/grunt-bump](https://www.npmjs.com/package/grunt-bump))

* Responsible for creating the latest tag and release commit of the repo. In order, it:
  1. Bumps the version number in Filer's `package.json` and `bower.json` files
  2. Creates a release commit including updated manifest files and new filer distribution files
  3. Tags the repo at this new version
  4. Pushes the tag and the release commit upstream

#### `build-tests` ([#3-grunt-build-tests](#3-grunt-build-tests))

* Generates single-file versions of the test suite and a separate Filer distribution file for testing Filer's compatibility with the [requirejs module system](http://requirejs.og/).

#### `usebanner` ([https://www.npmjs.com/package/grunt-banner](https://www.npmjs.com/package/grunt-banner))
* *:publish*: Adds a banner to the generated test and performance test files. The banner contents are generated as part of the `grunt publish` task itself.

#### `gitadd` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:publish*: Adds the Filer test files to git's staging area to allow us to stash it in the next step

#### `gitstash` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:publish*: Stashes the Filer test files in preparation for switching to the `gh-pages` branch in the next step

#### `gitcheckout` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:publish*: Checks out the `gh-pages` branch to prepare for committing the newly generated test files in the next three steps

#### `gitrm` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:publish*: Equivalent of `git rm -f`, this task forces a removal of the existing versions of the generated test files on this branch in preparation for the next step.

#### `gitstash` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:pop*: Equivalent of `git stash pop`, this task reintroduces the staging area containing the newest version of the generated test files.

#### `gitcommit` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:publish*: This task commits the current staging area containing the newly generated test files. The commit message is generated during the `grunt publish` task itself.

#### `gitpush` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:publish*: This task pushes the local `gh-pages` branch to the remote specified in Filer's .env file as FILER_UPSTREAM_REMOTE_NAME.

#### `gitcheckout` ([https://www.npmjs.com/package/grunt-git](https://www.npmjs.com/package/grunt-git))
* *:revert*: This task checks out back to the main branch ('develop' by default, specified in the .env as FILER_UPSTREAM_BRANCH)

#### `npm-publish` ([https://www.npmjs.com/package/grunt-npm](https://www.npmjs.com/package/grunt-npm))

* Publishes the latest release to NPM

