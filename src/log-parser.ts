import {LogParserOptions, ParseResultSet, PM2LogEntry} from "./types.js";
import {getLogFiles, readLogFile, writeTSV} from "./file-handlers.js";
import Debug from "debug";
import {match} from "path-to-regexp";
import {parseEOL} from "./utils.js";

const debug = Debug('chums:src:log-parser');

const pm2Regex = /([T\d:.-]+Z)\s([\w:\-]+)\s(::[a-f0-9:.]+,\s[0-9.]+|[0-9.]+)\s(\S+)\s([A-Z]+)\s(\S+)\s(\S+)/

export const parsePM2Log = (contents: string): PM2LogEntry | null => {
    if (!pm2Regex.test(contents)) {
        return null;
    }
    const matches = contents.match(pm2Regex);
    if (!matches) return null;
    return {
        timestamp: matches[1],
        debugPath: matches[2],
        ip: matches[3],
        user: matches[4],
        method: matches[5],
        url: matches[6],
        referrer: matches[7],
    }
}

export async function parseLog(filename: string, options?: LogParserOptions): Promise<ParseResultSet> {
    const result: ParseResultSet = {};
    const file = await readLogFile(filename, options);
    const split = parseEOL(file);
    const lines = file.split(split);
    const pathTest = options?.path ? match(options.path) : () => true;
    if (options?.verbose) debug("parseLog()", `lines: ${lines.length}`);
    lines.forEach(line => {
        const parsed = parsePM2Log(line);
        if (parsed) {
            const [url, query] = parsed.url.split('?');
            if (!pathTest(url)) {
                return;
            }
            if (!result[url]) {
                result[url] = {
                    path: url,
                    count: 0,
                }
                if (options?.includeUsers) {
                    result[url].users = [];
                }
                if (options?.includeReferrers) {
                    result[url].referrers = [];
                }
            }
            result[url].count++;
            if (options?.includeUsers && !result[url].users?.includes(parsed.user)) {
                result[url].users?.push(parsed.user);
            }
            if (options?.includeReferrers && !result[url].referrers?.includes(parsed.referrer)) {
                result[url].referrers?.push(parsed.referrer);
            }
        }
    })
    debug('parseLog()', result);
    return result;
}

export async function logCalledEndpoints(parseOptions: LogParserOptions) {
    const files = await getLogFiles(parseOptions)
    const combined: ParseResultSet = {};
    for await (const file of files) {
        if (parseOptions.verbose) debug("main()", `processing: ${file}`);
        const result = await parseLog(file, parseOptions);
        if (parseOptions.combined) {
            Object.values(result).forEach(entry => {
                if (!combined[entry.path]) {
                    combined[entry.path] = {
                        path: entry.path,
                        count: 0,
                    }
                    if (parseOptions.includeUsers) {
                        combined[entry.path].users = [];
                    }
                    if (parseOptions.includeReferrers) {
                        combined[entry.path].referrers = [];
                    }
                }
                combined[entry.path].count += entry.count;
                entry.users?.forEach(user => {
                    if (!combined[entry.path].users?.includes(user)) {
                        combined[entry.path].users?.push(user);
                    }
                })
                entry.referrers?.forEach(referrer => {
                    if (!combined[entry.path].referrers?.includes(referrer)) {
                        combined[entry.path].referrers?.push(referrer);
                    }
                })
            })
        }
        if (!parseOptions.combined) {
            await writeTSV(file, result, parseOptions);
        }
    }
    if (parseOptions.combined) {
        await writeTSV(parseOptions.outfile || 'combined.tsv', combined, parseOptions);
    }
    if (parseOptions.verbose) debug("main()", "done");
}
