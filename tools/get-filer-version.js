#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

const {spawn} = require('child_process');
const meow = require('meow');

const cli = meow(`
	Usage
    $ get-filer-version <SHA|branch|tag> [--out path/to/filer.js]

  Options
    --out, -o    Specify a Filer module path to use for output

  Examples
    $ get-filer-version v0.0.44
    $ get-filer-version v0.0.44 --out filer.js
`, {
  description: 'Try to get an old version of Filer based on git SHA, branch, or tag',
  flags: {
    out: {
      type: 'string',
      alias: 'o'
    }
  }
});

// Get arg list, make sure we get a SHA argument
cli.flags.app = cli.input.slice(1);
if(!(cli.input && cli.input.length === 1)) {
  console.error('Specify a git SHA, branch or tag to use');
  process.exit(1);
}

const sha = cli.input[0];
const out = cli.flags.out || `filer-${sha}.js`;
// https://stackoverflow.com/questions/888414/git-checkout-older-revision-of-a-file-under-a-new-name?answertab=active#tab-top
const cmd = `git show ${sha}:dist/filer.js > ${out}`;
spawn (cmd, [], {stdio: 'inherit', shell: true});
