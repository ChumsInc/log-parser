import 'dotenv/config';
import commandLineArgs from "command-line-args";
import {LogParserOptions} from "./src/types.js";
import Debug from "debug";
import path from "node:path";
import {logCalledEndpoints} from "./src/log-parser.js";
import {logDeprecatedCalls} from "./src/deprecated-calls-parser.js";

const debug = Debug('chums:index');

console.log(process.env.LOG_PATH);

const clOptions = commandLineArgs([
    {name: 'type', alias: 't', type: String},
    {name: 'verbose', alias: 'v', type: Boolean},
    {name: 'filter', type: String},
    {name: 'combined', alias: 'c', type: Boolean},
    {name: 'output', alias: 'o', type: String},
    {name: 'outfile', alias: 'f', type: String},
    {name: 'path', alias: 'p', type: String},
    {name: 'referrer', alias: 'r', type: Boolean},
    {name: 'user', alias: 'u', type: Boolean},
    {name: 'deprecated', alias: 'd', type: Boolean},
    {name: 'help', alias: 'h', type: Boolean},
]);

if (clOptions.help) {
    const help = `
    PM2 Log Parser
    Usage:
    node src/index.js <options>
    -----------------
    Options:
    -t, --type:  pm2|nginx - log format, defaults to pm2
    -v, --verbose: verbose output
    --filter: filter log files by prefix
    -c, --combined: combine all logs into one output file
    -o, --output: output format (json|tsv)
    -f, --outfile: output file name
    -p, --path: path filter, use express v5 path style syntax
    -r, --referrer: include referrer data
    -u, --user: include user data
    -d, --deprecated: parse deprecation message
    -h, --help: show this help
    `;
    console.log(help);
    process.exit(0);
}

function parseCLOptions(options: commandLineArgs.CommandLineOptions) {
    if (options.verbose) {
        debug("parseCLOptions()", options);
    }
    const parseOptions: LogParserOptions = {
        logPath: process.env.LOG_PATH || path.join(process.cwd(), 'logs'),
    }
    if (options.verbose) parseOptions.verbose = true;
    if (options.filter) parseOptions.filter = options.filter;
    if (options.combined) parseOptions.combined = true;
    if (options.output) parseOptions.output = options.output;
    if (options.outfile) parseOptions.outfile = options.outfile;
    if (options.path) parseOptions.path = options.path;
    if (options.referrer) parseOptions.includeReferrers = true;
    if (options.user) parseOptions.includeUsers = true;
    if (options.deprecated) parseOptions.deprecated = true;
    if (options.verbose) {
        debug("parseCLOptions()", parseOptions);
    }
    return parseOptions;
}

const parseOptions = parseCLOptions(clOptions);

if (clOptions.deprecated) {
    logDeprecatedCalls(parseOptions)
        .catch(err => {
            debug("logDeprecatedCalls()", err);
        })
    process.exit(0);
}

logCalledEndpoints(parseOptions)
    .catch(err => {
        debug("main()", err);
    })



