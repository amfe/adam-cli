#!/usr/bin/env node
'use strict';

var bluebird = require('bluebird');
var fse = bluebird.promisifyAll(require('fs-extra'));
var path = require('path');

var helper = require('./helper');

// clean 就是将 ~/.adam 目录删除
module.exports = function (conf) {
    // clean 不能保证传入的 conf 一定正确，所以需要无依赖的获取一遍 ~/.adam 的路径
    var HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    var ADAM_HOME = path.join(HOME, '.adam');

    fse.removeAsync(ADAM_HOME)
        .then(function () {
            helper.print('Success', 'Adam\'s directory is removed now.');
        })
        .catch(function (ret) {
            helper.print('Error', ret);
        });
};

