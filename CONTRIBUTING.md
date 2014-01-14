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

Once you've done some hacking and you'd like to have your work merged, you'll need to
make a pull request. If you're patch includes code, make sure to check that all the
unit tests pass, including any new tests you wrote. Finally, make sure you add yourself
to the `AUTHORS` file.

## Tests

Tests are writting using [Jasmine](http://pivotal.github.io/jasmine/). You can run the tests
in your browser by opening the `tests` directory. You can also run them
[here](http://js-platform.github.io/idbfs/tests/).

## Communication

If you'd like to talk to someone about the project, you can reach us on irc.mozilla.org in the
mofodev channel. Look for "ack" or "humph".
