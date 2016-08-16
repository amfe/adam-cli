#!/usr/bin/env node
'use strict';

var bluebird = require('bluebird');

// Promise polyfill
if (typeof Promise === 'undefined') {
    Promise = bluebird;
}

module.exports = {
    // print msg
    print: function (type, msg) {
        var prefix = type ? type + ': ' : '';
        console.log(prefix + msg);
    },

    // 在一个对象数组中，通过指定的 key，拿到对应的 index
    getIndexByKey: function (array, key, value) {
        var index = -1;

        for (var i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                index = i;
                break;
            }
        }

        return index;
    },

    // from: https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
    request: function (url) {
        // return new pending promise
        return new Promise(function (resolve, reject) {
            // select http or https module, depending on reqested url
            var lib = url.startsWith('https') ? require('https') : require('http');

            var request = lib.get(url, function (response) {
                // handle http errors
                if (response.statusCode < 200 || response.statusCode > 299) {
                    reject(new Error('Failed to load page, status code: ' + response.statusCode));
                }

                // temporary data holder
                var body = [];

                // on every content chunk, push it to the data array
                response.on('data', function (chunk) {
                    body.push(chunk);
                });

                // we are done, resolve promise with those joined chunks
                response.on('end', function () {
                    resolve(body.join(''));
                });
            });

            // handle connection errors of the request
            request.on('error', function (err) {
                reject(err);
            });
        });
    }
};

