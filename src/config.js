#!/usr/bin/env node
'use strict';

var bluebird = require('bluebird');
var inquirer = require('inquirer');
var fse = bluebird.promisifyAll(require('fs-extra'));

var helper = require('./helper');

var questions = require('./config-quiz').questions;

// Promise polyfill
if (typeof Promise === 'undefined') {
    Promise = bluebird;
}

module.exports = function (conf) {
    inquirer.prompt(questions)
    // 初始拿到 groupUrl, token 两项
    .then(function (answers) {
        if (!answers.groupUrl) {
            return Promise.reject('No gitlab group url or github organizations given.');
        }

        // https://github.com/<group>
        // http://gitlab.com/groups/<group>
        var match = answers.groupUrl.match(/^(https?:\/\/)(.+?)\/(?:groups\/)?(.+?)\/?$/);
        if (!match) {
            return Promise.reject('Given\'s URL is invalid.');
        }

        // 根据 groupUrl，判断是 gitlab 还是 github
        var type = /github\.com/.test(answers.groupUrl) ? 'github' : 'gitlab';
        var protocol = match[1];
        var host = match[2];
        var group = match[3];

        // api 规则:
        // https://developer.github.com/v3/repos/#list-organization-repositories
        // https://gitlab.com/help/api/groups.md#details-of-a-group
        var api = type === 'github'
                  ? 'https://api.github.com/orgs/' + group + '/repos'
                  : protocol + host + '/api/v3/groups/' + group + '?private_token=' + answers.token;

        answers.type = type;
        answers.host = host;
        answers.group = group;
        answers.api = api;

        return answers;
    })
    // 将最终结果保存到 config.json 中
    .then(function (answers) {
        conf.config = answers;
        //conf.config = {
        //    groupUrl: answers.groupUrl,
        //    token: answers.token,
        //
        //    type: answers.type,
        //    host: answers.host,
        //    group: answers.group,
        //    api: answers.api
        //};

        return fse.writeJsonAsync(conf.env.ADAM_CONFIG_FILE, conf, {spaces: 4})
            .then(function () {
                return conf;
            });
    })
    .then(function () {
        helper.print('Success', 'Configuration saved.');
    })
    .catch(function (ret) {
        helper.print('Error', ret);
    });
};
