#!/usr/bin/env node

// binary for NCS

var args   = process.argv.slice(2);
var colors = require('chalk');
var fs     = require('fs');
var ncs    = require('./ncs.js'); // load module core
var readlineSync = require('readline-sync');

switch(args[0]) {
    case 'run':
        ncs.load(args[1] || 'main');
        process.exit(0);

        break;

    case 'shell':
        while(true) {
            var cmd = readlineSync.question('> ');

            if(cmd === 'exit')
                process.exit(0);

            ncs.run(cmd);
        }

        break;
}
