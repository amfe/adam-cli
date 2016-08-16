#!/usr/bin/env node
'use strict';

var bluebird = require('bluebird');
var fse = bluebird.promisifyAll(require('fs-extra'));
var exec = bluebird.promisify(require('child_process').exec);
var path = require('path');

var helper = require('../src/helper');

var subcommands = {
        version: require('../src/version'),
        clean: require('../src/clean'),
        config: require('../src/config'),
        template: require('../src/template'),
        init: require('../src/init'),
        help: require('../src/help')
    };

var HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var ADAM_HOME = path.join(HOME, '.adam');
var ADAM_CONFIG_FILE = path.join(ADAM_HOME, 'config.json');
var ADAM_TEMPLATES_DIR = path.join(ADAM_HOME, 'templates');

// Promise polyfill
if (typeof Promise === 'undefined') {
    Promise = bluebird;
}

// entry
Promise.resolve(true)
    // 确保 ~/.adam/
    .then(function () {
        return fse.ensureDirAsync(ADAM_HOME);
    })
    // 确保 ~/.adam/templates/
    .then(function () {
        return fse.ensureDirAsync(ADAM_TEMPLATES_DIR);
    })
    // 确保 ~/.adam/config.json
    .then(function () {
        return fse.ensureFileAsync(ADAM_CONFIG_FILE);
    })
    // 读取 ~/.adam/config.json
    .then(function () {
        return fse.readJsonAsync(ADAM_CONFIG_FILE);
    })
    // 如果是新创建的 config.json 文件无内容，则会进入到此 catch 分支
    .catch(function () {
        var conf = {
                env: {
                    ADAM_HOME: ADAM_HOME,
                    ADAM_CONFIG_FILE: ADAM_CONFIG_FILE,
                    ADAM_TEMPLATES_DIR: ADAM_TEMPLATES_DIR
                },
                templates: [],
                last: {},
                config: {}
            };

        return fse.writeJsonAsync(ADAM_CONFIG_FILE, conf, {spaces: 4})
            .then(function () {
                return conf;
            });
    })
//    // 针对 adam 0.0.x 版本做兼容，这个 .then 中的代码以后可以去掉
//    .then(function (conf) {
//        // 之前版本的 config.json 格式不同，转为新的格式
//        if (!conf.env) {
//            // 新 config.json 格式
//            var newConf = {
//                    env: {
//                        ADAM_HOME: ADAM_HOME,
//                        ADAM_CONFIG_FILE: ADAM_CONFIG_FILE,
//                        ADAM_TEMPLATES_DIR: ADAM_TEMPLATES_DIR
//                    },
//                    templates: conf.templates,
//                    last: {
//                        template: conf.lastTemplate,
//                        user: conf.lastUser
//                    },
//                    config: {}
//                };
//
//            // 之前版本在 ~/.adam/templates 下故意删除了 .git 目录，需要重新更新所有 templates
//            // 先将 templates 目录清空
//            return fse.emptyDirAsync(ADAM_TEMPLATES_DIR)
//                // 然后将记录的 templates 依次 git clone
//                .then(function () {
//                    return Promise.all(
//                        conf.templates.map(function (item) {
//                            var templatePath = path.join(ADAM_TEMPLATES_DIR, item.name);
//                            var command = 'git clone "' + item.url + '" "' + templatePath + '"';
//                            return exec(command);
//                        })
//                    );
//                })
//                // 保存新的 config.json
//                .then(function () {
//                    return fse.writeJsonAsync(ADAM_CONFIG_FILE, newConf, {spaces: 4});
//                })
//                // 将新保存的 config 返回
//                .then(function () {
//                    return newConf;
//                });
//        }
//        else {
//            return conf;
//        }
//    })
    // 根据参数做分发
    .then(function (conf) {
        var argv = process.argv;
        var command = argv[2];

        var templateSubCommands = [
                'add',
                'rename', 'move',
                'remove', 'delete', 'del',
                'update',
                'list'
            ];

        // 没有加参数
        if (!command) {
            command = 'init';
        }
        // adam version/-v/-V/--version
        else if (/^(?:-v|-V|--version)$/.test(command)) {
            command = 'version';
        }
        // adam template/tpl/tmpl
        else if (/^(?:tpl|tmpl)$/.test(command)){
            command = 'template';
        }
        // adam add/rename/move/remove/del/delete/update/list
        else if (new RegExp('^(?:' + templateSubCommands.join('|') + ')$').test(command)) {
            command = 'template';
            // 调整参数至标准位置
            argv.splice(2, 0, command);
        }
        // adam help/-h/--help
        else if (/^(?:-h|--help)$/.test(command)) {
            command = 'help';
        }

        // 在 adam help 中，又涉及到了 template 的子命令快捷方式
        if (command === 'help') {
            // adam help tpl/tmpl
            if (/^(?:tpl|tmpl)$/.test(argv[3])){
                argv[3] = 'template';
            }

            // adam help add/...
            if (new RegExp('^(?:' + templateSubCommands.join('|') + ')$').test(argv[3])) {
                argv.splice(3, 0, 'template');
            }
        }

        // 将 template 中的 alias 调整为标准 参数
        var alias;
        if (command === 'template') {
            alias = argv[3];
        }
        else if (command === 'help') {
            alias = argv[4];
        }
        if (alias) {
            if (alias === 'move') {
                alias = 'rename';
            }
            else if (/del|delete/.test(alias)) {
                alias = 'remove';
            }
            argv[command === 'template' ? 3 : 4] = alias;
        }

        // 有匹配命令则传入统一参数
        if (subcommands[command]) {
            subcommands[command](conf, argv[3], argv[4], argv[5]);
        }
        else {
            helper.print('Error', 'Unknow command: `' + command + '`');
        }
    })
    .catch(function (ret) {
        helper.print('Error', ret);
    });
