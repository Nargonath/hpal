'use strict';

const ChildProcess = require('child_process');
const Path = require('path');
const Stream = require('stream');
const Somever = require('@hapi/somever');
const Hpal = require('..');
const DisplayError = require('../lib/display-error');

exports.Hapi = Somever.match(process.version, '>=12') ? require('@hapi/hapi-20') : require('@hapi/hapi');

exports.bin = (argv, cwd) => {

    return new Promise((resolve, reject) => {

        const path = Path.join(__dirname, '..', 'bin', 'hpal');
        const cli = ChildProcess.spawn('node', [].concat(path, argv), { cwd: cwd || __dirname });

        let output = '';
        let errorOutput = '';
        let combinedOutput = '';

        cli.stdout.on('data', (data) => {

            output += data;
            combinedOutput += data;
        });

        cli.stderr.on('data', (data) => {

            errorOutput += data;
            combinedOutput += data;
        });

        cli.once('close', (code, signal) => {

            if (signal) {
                return reject(new Error(`Unexpected signal: ${signal}`));
            }

            return resolve({ output, errorOutput, combinedOutput, code, signal });
        });
    });
};

exports.cli = (argv, cwd, colors) => {

    argv = ['x', 'x'].concat(argv); // [node, script, ...args]
    cwd = cwd ? (Path.isAbsolute(cwd) ? cwd : `${__dirname}/closet/${cwd}`) : __dirname;

    const stdin = new Stream.PassThrough();
    const stdout = new Stream.PassThrough();
    const stderr = new Stream.PassThrough();

    let output = '';

    stdout.on('data', (data) => {

        output += data;
    });

    let errorOutput = '';

    stderr.on('data', (data) => {

        errorOutput += data;
    });

    const options = {
        argv,
        env: {},
        cwd,
        in: stdin,
        out: stdout,
        err: stderr,
        colors: !!colors
    };

    const cli = (async () => {

        try {

            await Hpal.start(options);

            return { err: null, output, errorOutput, options };
        }
        catch (err) {

            output = output.trim(); // Ignore leading and trailing whitespace for testing purposes

            if (!(err instanceof DisplayError)) {
                err.output = output;
                err.options = options;
                throw err;
            }

            return { err, output, errorOutput: err.message, options };
        }
    })();

    return Object.assign(cli, { options });
};
