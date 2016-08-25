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
 * @param {Object} conf  config.json 文件内容
 * @param {String} type  action type: ['add', 'rename', 'remove', 'update', 'list']
 * @param {String} name  a template name (type in ['add', 'rename', 'remove', 'update'])
 *                       a project name  (type in ['add'])
 *                       a string        (type in ['update', 'list', 'search'])
 * @param {String} extra a git repo url  (type in ['add'])
 *                       a template name (type in ['rename'])
 *                       empty string    (type in ['add', 'remove', 'update', 'list'])
 */
module.exports = function (conf, type, name, extra) {
    var ready = Promise.resolve(conf);

    /**
     * 保存 config.json
     *
     * @param  {Object} conf config.json 文件内容
     * @return {Object} same as @param conf
     */
    function saveConfig (conf) {
        return fse.writeJsonAsync(conf.env.ADAM_CONFIG_FILE, conf, {spaces: 4})
            .then(function () {
                return conf;
            });
    }

    var actions = {
            // add <template-name> <template-git-repo-url>
            // add <project-name>
            add: function (name, url) {
                ready
                    // 参数校验
                    .then(function (conf) {
                        // 未传入 name
                        if (!name) {
                            return Promise.reject('Need template name.');
                        }

                        var index = helper.getIndexByKey(conf.templates, 'name', name);

                        // 如果已经存在同名模板
                        if (index > -1) {
                            return Promise.reject('Template ' + name + ' is exists.');
                        }

                        var regexGithubShortUrl = /^([\w\._-]+)\/([\w\._-]+)(#[\w\._-]+)?$/;
                        var regexGitRepoUrl = /^(?:git@|git:\/\/|https?:\/\/).+\/([\w\._-]+)\.git$/;
                        var matchGithubShortUrl;
                        var matchGitRepoUrl;

                        if (!url) {
                            matchGithubShortUrl = name.match(regexGithubShortUrl);
                            matchGitRepoUrl = name.match(regexGitRepoUrl);

                            // add user/repo
                            if (matchGithubShortUrl) {
                                name = matchGithubShortUrl[1] + '/' + matchGithubShortUrl[2];
                                url = 'git@github.com:' + name + '.git';
                            }
                            // add git@github.com:user/name.git
                            else if (matchGitRepoUrl) {
                                url = name;
                                name = matchGitRepoUrl[1];
                            }
                            // add name
                            else {
                                var group = conf.config.group;
                                if (!group) {
                                    return Promise.reject('Need git repo url. Or run `adam config` first.');
                                }

                                // git@github.com:amfe/name.git
                                // git@gitlab.com:adam-templates/name.git
                                url = 'git@' + conf.config.host + ':' + group + '/' + name + '.git';
                            }
                        }
                        else {
                            matchGithubShortUrl = url.match(regexGithubShortUrl);
                            matchGitRepoUrl = url.match(regexGitRepoUrl);

                            // add name user/repo
                            if (matchGithubShortUrl) {
                                var _name = matchGithubShortUrl[1] + '/' + matchGithubShortUrl[2];
                                url = 'git@github.com:' + _name + '.git';
                            }
                            // add name url
                            else if (matchGitRepoUrl) {
                                // normal style, do nothing
                            }
                            else {
                                return Promise.reject('It\'s not a git repo url: ' + url + '.');
                            }
                        }

                        return conf;
                    })
                    // 下载模板
                    .then(function (conf) {
                        var templatePath = path.join(conf.env.ADAM_TEMPLATES_DIR, name);
                        var command = 'git clone "' + url + '" "' + templatePath + '"';

                        return exec(command)
                            .then(function () {
                                return conf;
                            });
                    })
                    // 维护 ~/.adam/config.json
                    .then(function (conf) {
                        conf.templates.push({
                            name: name,
                            url: url
                        });

                        return conf;
                    })
                    .then(saveConfig)
                    // 输出结果
                    .then(function () {
                        helper.print('Success', 'Template ' + name + ' has been added.');
                    })
                    .catch(function (ret) {
                        helper.print('Error', ret);
                    });
            },
            rename: function (originName, targetName) {
                ready
                    // 参数检验
                    .then(function (conf) {
                        if (!originName) {
                            return Promise.reject('Need template origin name and target name');
                        }
                        if (!targetName) {
                            return Promise.reject('Need template target name');
                        }

                        var originIndex = helper.getIndexByKey(conf.templates, 'name', originName);
                        var targetIndex = helper.getIndexByKey(conf.templates, 'name', targetName);

                        // 旧名称不存在
                        if (originIndex === -1) {
                            return Promise.reject('Template ' + originName + ' not found.');
                        }
                        // 新名称已存在
                        else if (targetIndex > -1) {
                            return Promise.reject('New name `' + targetName + '` is exists.');
                        }

                        return [conf, originIndex];
                    })
                    // 重命名 ~/.adam/templates 下的目录名
                    .then(function (ret) {
                        var conf = ret[0];

                        var originTemplatePath = path.join(conf.env.ADAM_TEMPLATES_DIR, originName);
                        var targetTemplatePath = path.join(conf.env.ADAM_TEMPLATES_DIR, targetName);

                        return fse.moveAsync(originTemplatePath, targetTemplatePath)
                            .then(function () {
                                return ret;
                            });
                    })
                    // 修改 ~/.adam/config.json
                    .then(function (ret) {
                        var conf = ret[0];
                        var originIndex = ret[1];

                        conf.templates[originIndex].name = targetName;
                        return conf;
                    })
                    .then(saveConfig)
                    .then(function () {
                        helper.print('Success', 'Template ' + originName + ' -> ' + targetName);
                    })
                    .catch(function (ret) {
                        helper.print('Error', ret);
                    });
            },
            remove: function (name) {
                ready
                    // 参数校验
                    .then(function (conf) {
                        // 未传入 name
                        if (!name) {
                            return Promise.reject('Need template name.');
                        }

                        var index = helper.getIndexByKey(conf.templates, 'name', name);

                        // 名称不存在
                        if (index === -1) {
                            return Promise.reject('Template ' + name + ' not found.');
                        }

                        return [conf, index];
                    })
                    // 删除 ~/.adam/templates 下的相应目录
                    .then(function (ret) {
                        var conf = ret[0];

                        var templatePath = path.join(conf.env.ADAM_TEMPLATES_DIR, name);

                        return fse.removeAsync(templatePath)
                            .then(function () {
                                return ret;
                            });
                    })
                    // 修改 ~/.adam/templates
                    .then(function (ret) {
                        var conf = ret[0];
                        var index = ret[1];

                        conf.templates.splice(index, 1);
                        return conf;
                    })
                    .then(saveConfig)
                    .then(function () {
                        helper.print('Success', 'Template ' + name + ' has been removed.');
                    })
                    .catch(function (ret) {
                        helper.print('Error', ret);
                    });
            },
            update: function (name) {
                ready
                    // 参数校验
                    .then(function (conf) {
                        // 未传入 name
                        if (!name) {
                            return Promise.reject('Need template name.');
                        }

                        // 默认更新所有模板
                        var list = conf.templates;

                        // 如果本地无模板
                        if (list.length === 0) {
                            return Promise.reject('No templates.');
                        }

                        // 如果只是更新一个模板，则把该模板数据取出来
                        if (name !== '-a') {
                            var index = helper.getIndexByKey(conf.templates, 'name', name);
                            if (index === -1) {
                                return Promise.reject('Template ' + name + ' not found.');
                            }

                            list = [conf.templates[index]];
                        }

                        return [conf, list];
                    })
                    // 执行更新
                    .then(function (ret) {
                        var conf = ret[0];
                        var list = ret[1];

                        return Promise.all(
                            list.map(function (item) {
                                var templatePath = path.join(conf.env.ADAM_TEMPLATES_DIR, item.name);
                                var command = 'cd "' + templatePath + '" && git pull';

                                return exec(command)
                                    .then(function () {
                                        helper.print('Success', 'Template ' + item.name + ' is up to date.');
                                    });
                            })
                        );
                    })
                    .catch(function (ret) {
                        helper.print('Error', ret);
                    });
            },
            // option === -v: show detail
            // option === -a: list all project in git group
            list: function (option) {
                ready
                    .then(function (conf) {
                        // 只需要列本地目录
                        if (!option || option !== '-a') {
                            var templates = conf.templates;
                            var messages = [];

                            if (!templates.length) {
                                messages.push('No templates.');
                            }
                            else {
                                messages = templates.map(function (item, index) {
                                    var line = ++index === templates.length ? '└── ' : '│── ';
                                    var msg = line + item.name + (option === '-v' ? ': ' + item.url : '');
                                    return msg;
                                });
                                messages.unshift('Templates List:');
                            }

                            return messages;
                        }
                        // 通过接口列远程目录
                        else {
                            // 检测是否已经 `adam config`
                            if (!conf.config.api) {
                                return Promise.reject('Use `adam config` to add default settings first.');
                            }

                            // 取数据
                            return helper.request(conf.config.api)
                                .then(function (ret) {
                                    // Node 0.12 拿到的是一个数组，第1个参数为 exec 的结果
                                    // Node 4.2 拿到的是一个字符串，本身就是 exec 结果
                                    var data = JSON.parse(typeof ret === 'string' ? ret : ret[0]);

                                    // gitlab, github 的返回数据不同，分别处理
                                    var isGitlab = conf.config.type === 'gitlab';
                                    if (isGitlab) {
                                        data = data.projects;
                                    }

                                    var messages = [];
                                    if (!data.length) {
                                        messages.push('No templates on remote server.');
                                    }
                                    else {
                                        messages = data.map(function (item, index, array) {
                                            var last = ++index === array.length;
                                            var line1 = last ? '└── ' : '├── ';
                                            var line2 = last ? ' ' : '│';

                                            var msg = [];
                                            msg.push(line1 + item.name);
                                            msg.push(line2 + '   │──Website: ' + (item.web_url || item.html_url));
                                            msg.push(line2 + '   │──GitRepo: ' + (item.ssh_url_to_repo || item.ssh_url));
                                            msg.push(line2 + '   └──Description: ' + (item.description || '-'));

                                            return msg.join('\n');
                                        });
                                        messages.unshift('Remote Templates List:');
                                    }

                                    return messages;
                                });
                        }
                    })
                    // 打印结果
                    .then(function (messages) {
                        helper.print(false, messages.join('\n'));
                    })
                    .catch(function (ret) {
                        helper.print('Error', ret);
                    });
            }
        };

    // entry
    // 如果没有传入任何参数，则显示列表
    if (!type) {
        type = 'list';
    }

    if (actions[type]) {
        actions[type](name, extra);
    }
    else {
        helper.print('Error', 'Unknow action: `' + type + '`');
    }
};
