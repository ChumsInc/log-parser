import {LogParserOptions, ParseResultSet, PM2DeprecationLogEntry, PM2LogEntry} from "./types.js";
import Debug from "debug";
import {getLogFiles, readLogFile, writeTSV} from "./file-handlers.js";
import {parseEOL} from "./utils.js";
import {match} from "path-to-regexp";

const debug = Debug('chums:src:deprecated-calls-parser');

const pm2Regex = /([T\d:.-]+Z)\s(\S+)\s([A-Z]+)\s(\S+)\s([<]+\s\S+)\s(\S+)/;

export const parsePM2Log = (contents: string): PM2DeprecationLogEntry | null => {
    if (!pm2Regex.test(contents)) {
        return null;
    }
    const matches = contents.match(pm2Regex);
    if (!matches) return null;
    return {
        timestamp: matches[1],
        debugPath: matches[2],
        url: matches[4],
        referrer: matches[6],
    }
}

export async function parseDeprecatedCalls(filename: string, options?: LogParserOptions): Promise<ParseResultSet> {
    const result: ParseResultSet = {};
    const file = await readLogFile(filename, options);
    const split = parseEOL(file);
    const lines = file.split(split);
    const pathTest = options?.path ? match(options.path) : () => true;
    if (options?.verbose) debug("parseDeprecatedCalls()", `lines: ${lines.length}`);
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
                if (options?.includeReferrers) {
                    result[url].referrers = [];
                }
            }
            result[url].count++;
            if (options?.includeReferrers && !result[url].referrers?.includes(parsed.referrer)) {
                result[url].referrers?.push(parsed.referrer);
            }
        }
    })
    return result;
}

export async function logDeprecatedCalls(parseOptions: LogParserOptions) {
    const files = await getLogFiles(parseOptions)
    const combined: ParseResultSet = {};
    for await (const file of files) {
        if (parseOptions.verbose) debug("logDeprecatedCalls()", `processing: ${file}`);
        const result = await parseDeprecatedCalls(file, parseOptions);
        if (parseOptions.combined) {
            Object.values(result).forEach(entry => {
                if (!combined[entry.path]) {
                    combined[entry.path] = {
                        path: entry.path,
                        count: 0,
                    }
                    if (parseOptions.includeReferrers) {
                        combined[entry.path].referrers = [];
                    }
                }
                combined[entry.path].count += entry.count;
                entry.referrers?.forEach(referrer => {
                    if (!combined[entry.path].referrers?.includes(referrer)) {
                        combined[entry.path].referrers?.push(referrer);
                    }
                })
            })
        }
        if (!parseOptions.combined && Object.keys(result).length > 0) {
            await writeTSV(file, result, parseOptions);
        }

    }
    if (parseOptions.combined && Object.keys(combined).length > 0) {
        await writeTSV(parseOptions.outfile || 'combined.tsv', combined, parseOptions);
    }
    if (parseOptions.verbose) debug("logDeprecatedCalls()", "done");
}
