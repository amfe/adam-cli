#!/usr/bin/env node
'use strict';

var bluebird = require('bluebird');
var inquirer = require('inquirer');
var fse = bluebird.promisifyAll(require('fs-extra'));
var exec = bluebird.promisify(require('child_process').exec);
var path = require('path');

var creator = require('./main');
var helper = require('./helper');

var questions = require('./init-quiz');

// Promise polyfill
if (typeof Promise === 'undefined') {
    Promise = bluebird;
}

module.exports = function (conf) {
    var cwd = process.cwd();
    // 最后一级目录名
    var iwd = cwd.split(path.sep).reverse()[0];//.replace(' ', '-');

    Promise.resolve(conf)
        // 初始条件校验
        .then(function (conf) {
            if (!conf.templates.length) {
                return Promise.reject('Please add template first.');
            }

            return conf;
        })
        // 获取用户信息
        .then(function (conf) {
            return Promise.all([
                    exec('git config --get user.name')
                        .then(function (name) {
                            if (name) {
                                name = String(name);
                                // git config 拿到的内容可能有换行
                                return name.trim().replace(/\n/g, '');
                            }
                            return process.env.USER;
                        }),
                    exec('git config --get user.email')
                        .then(function (email) {
                            if (email) {
                                email = String(email);
                                return email.trim().replace(/\n/g, '');
                            }
                            return ''
                        })
                ])
                .then(function (ret) {
                    var user = {
                        name: ret[0],
                        email: ret[1]
                    };
                    return [conf, user];
                })
        })
        // 准备问题默认值
        .then(function (ret) {
            var conf = ret[0];
            var userInfo = ret[1];

            var last = conf.last;

            var templates = conf.templates.map(function (item) {
                return item.name;
            });

            var user = last.user || userInfo.name;

            var quiz = questions.init.map(function (item) {
                switch (item.name) {
                    case 'template':
                        item.default = last.template || templates[0];
                        item.choices = templates;
                        break;
                    case 'project':
                        item.default = iwd;
                        break;
                    case 'user':
                        item.default = user;
                        break;
                    case 'email':
                        item.default = last.email || userInfo.email || user;
                        break;
                }

                return item;
            });

            return [conf, quiz];
        })
        // 获取问答结果
        .then(function (ret) {
            var conf = ret[0];
            var quiz = ret[1];

            return inquirer.prompt(quiz)
                .then(function (answers) {
                    return [conf, answers];
                });
        })
        // 如果输入的 projectName 与 当前目录名不一致，则新建对应文件夹
        .then(function (ret) {
            //var conf = ret[0];
            var answers = ret[1];

            if (iwd !== answers.project) {
                return fse.ensureDirAsync(path.join(cwd, answers.project))
                    .then(function () {
                        answers.path = answers.project;
                        return ret;
                    });
            }
            else {
                answers.path = '';
                return ret;
            }
        })
        // 判断对应目录是否为空
        .then(function (ret) {
            //var conf = ret[0];
            var answers = ret[1];

            var initPath = path.join(cwd, answers.path);
            return fse.readdirAsync(initPath)
                .then(function (list) {
                    if (list.length) {
                        return Promise.reject(ret);
                    }
                    else {
                        return ret;
                    }
                })
                // 如果对应的目录不为空，则询问:
                // 1. 覆盖当前目录同名文件
                // 2. 退出
                .catch(function (ret) {
                    var conf = ret[0];
                    var answers = ret[1];

                    var quiz = questions.conflict;

                    return inquirer.prompt(quiz)
                        .then(function (ans) {
                            if (ans.action === 'quit') {
                                return Promise.reject('User exit.');
                            }

                            return [conf, answers];
                        });
                });
        })
        // 保存最后一次答案作为下一次的默认值
        .then(function (ret) {
            var conf = ret[0];
            var answers = ret[1];

            var last = conf.last;

            // 只在有必要时更新 config.json
            if (last.template !== answers.template || last.user !== answers.user || last.email !== answers.email) {
                conf.last = {
                    template: answers.template,
                    user: answers.user,
                    email: answers.email
                };

                return fse.writeJsonAsync(conf.env.ADAM_CONFIG_FILE, conf, {spaces: 4})
                    .then(function () {
                        return ret;
                    });
            }
            else {
                return ret;
            }
        })
        // 初始化项目
        .then(function (ret) {
            var conf = ret[0];
            var answers = ret[1];

            creator(conf, answers);
        })
        .catch(function (ret) {
            helper.print('Error', ret);
        });
};
