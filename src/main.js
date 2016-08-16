#!/usr/bin/env node
'use strict';

var bluebird = require('bluebird');
var fse = bluebird.promisifyAll(require('fs-extra'));
var exec = bluebird.promisify(require('child_process').exec);
var path = require('path');

var helper = require('./helper');

// Promise polyfill
if (typeof Promise === 'undefined') {
    Promise = bluebird;
}

/**
 * 遍历一个目录，拿到目录下所有的文件
 * ref: http://stackoverflow.com/a/16684530
 */
function walk (dir) {
    var results = [];
    var list = fse.readdirSync(dir);

    list.forEach(function (file) {
        file = path.join(dir, file);
        var stat = fse.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        }
        else {
            results.push(file);
        }
    });

    return results;
}

module.exports = function (conf, answers) {
    // 模板所在路径
    var templatePath = path.join(conf.env.ADAM_TEMPLATES_DIR, answers.template);
    // 需要初始化的路径
    var initPath = path.join(process.cwd(), answers.path);
    // 中转临时路径
    var tmpPath = path.join(conf.env.ADAM_HOME, '_' + Date.now());

    Promise.resolve(true)
        // 根据用户选择的 branch 切换到相应分支
        .then(function () {
            // 切换到模板目录 -> 下载所有 repo 内容 -> checkout
            var cmd1 = 'cd "' + templatePath + '"';
            var cmd2 = 'git fetch --all && git pull --verbose';
            var cmd3 = 'git checkout ' + answers.branch;

            // 如果没有网络，git fetch/pull 命令出错，因为已经保存了对应的 .git，出错时直接 checkout
            var command = [cmd1, cmd2, cmd3].join(' && ');
            return exec(command)
                .catch(function () {
                    command = [cmd1, cmd3].join(' && ');
                    return exec(command);
                });
        })
        // 复制模板文件到临时路径
        .then(function () {
            // 从 0.2.0 开始，推荐将模板放在 template 目录下，所以优先检查是否有 template 目录
            var list = fse.readdirSync(templatePath);
            if (list.indexOf('template') > -1) {
                var testPath = path.join(templatePath, 'template')
                var stat = fse.statSync(testPath);
                if (stat && stat.isDirectory()) {
                    templatePath = testPath;
                }
            }

            return fse.copyAsync(templatePath, tmpPath, '-R');
        })
        // 删除其中的 .git 目录
        .then(function () {
            var dotGit = path.join(tmpPath, '.git');
            return fse.removeAsync(dotGit);
        })
        // 遍历模板文件，做预操作
        .then(function () {
            // 取到目录下所有的文件
            var files = walk(tmpPath);

            // 因为没有找到合适的判断文件类型的工具，所以直接通过后缀名判断
            var fileExtnameList = [
                    'jpg', 'jpeg', 'png', 'gif', 'webp', 'ico', // image
                    'mp3', 'ogg', 'aac', // audio
                    'mp4', 'swf', 'webm', // video
                    'ttf', 'otf', 'wotf', 'eot', 'svg', // font
                    'psd', 'sketch', // design
                    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', // ms-office
                    'wps', 'et', 'dps', // wps-office
                    'pages', 'numbers', 'key', // iwork
                    'pdf', 'rtf', // document
                    'rp', 'xmind', // prototype
                    'zip', 'rar', 'tgz', 'tar', 'gz', // archive
                    'exe', 'dmg', 'app' // application
                ];
            var fileExtnameListRegexp = new RegExp('\\.(' + fileExtnameList.join('|') + ')$', 'i');

            return Promise.all(
                files.map(function (file) {
                    // 如果是 keeper 文件，则将之删除
                    // .keep | .gitkeep | .gitkeeper | .keeper
                    if (/\/\.(?:git)?keep(?:er)?$/.test(file)) {
                        return fse.removeAsync(file);
                    }
                    // 如果是列表中的后缀文件，则跳过
                    else if (fileExtnameListRegexp.test(file)) {
                        return true;
                    }
                    // 否则做变量替换
                    else {
                        return fse.readFileAsync(file, 'utf8')
                            .then(function (doc) {
                                for (var p in answers) {
                                    var regex = new RegExp('{{\\s*' + p + '\\s*}}', 'g');
                                    doc = doc.replace(regex, answers[p]);
                                }

                                return doc;
                            })
                            .then(function (doc) {
                                return fse.writeFileAsync(file, doc);
                            });
                    }
                })
            );
        })
        // 将 tmpPath 移动到 最终的初始项目路径
        .then(function () {
            return fse.copyAsync(tmpPath, initPath)
                // 同时把临时目录删除
                .then(function () {
                    return fse.removeAsync(tmpPath);
                });
        })
        // 输出复制结果
        .then(function () {
            var projectPath = answers.path || '.';
            var isWin = /^win/.test(process.platform);

            // windows7 中是有 tree 这个命令
            //var command = isWin ? 'tree /f' : 'tree -C';
            var command = isWin ? ('tree /f ' + projectPath)
                                : ("find " + projectPath + " ! -path '*/.git*' | sed -e 1d -e 's#[^-][^\/]*\/#|--#g' -e 's#^|--# #'");
            return exec(command)
                .then(function (result) {
                    // 在 node 4 中 拿到的 result 是一个字符串，0.10~0.12 是一个数组
                    if (typeof result === 'object' && result.join) {
                        result = result.join('\n');
                    }
                    helper.print(false, 'Awesome! Your project is created!' + '\n');
                    helper.print(false, initPath);
                    helper.print(false, result);
                });
        })
        .catch(function (ret) {
            helper.print('Error', ret);
        });
};
