#!/usr/bin/env node
'use strict';

var helper = require('./helper');

var pkg = require('../package.json');

module.exports = function () {
    helper.print(false, 'Adam version "' + pkg.version + '"');
};
