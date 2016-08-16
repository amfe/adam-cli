#!/usr/bin/env node
'use strict';

var helper = require('./helper');

var helpdata = require('./help.json');

module.exports = function (conf, command, subcommand) {
    // 默认输出 default 段
    if (!command || !helpdata[command]) {
        command = 'default';
    }

    // 只输出需要展现的帮助信息
    var data = helpdata[command];

    // 如果非 default 段，且有二级子命令则只展示二级子命令的帮助信息
    if (command !== 'default' && subcommand) {
        var index = helper.getIndexByKey(helpdata[command], 'id', subcommand);

        if (index > -1) {
            // 取出来的是一个对象，要用数组套一下
            data = [helpdata[command][index]];
        }
    }

    // 拼展现结果
    var message = data.map(function (item) {
        var msg = [];

        msg.push('');
        msg.push('  ' + item.subject);

        var text = item.text.map(function (text) {
            return '    ' + text;
        });
        msg.push(text.join('\r\n'));

        return msg.join('\r\n');
    });

    // 最后多加一个空行
    message.push('');

    helper.print(false, message.join('\r\n'));
};
