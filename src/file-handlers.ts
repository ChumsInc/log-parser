import {readdir, readFile, writeFile} from 'node:fs/promises'
import Debug from 'debug';
import {LogParserOptions, ParseResultSet} from "./types.js";
import path from "node:path";
import {EOL} from "node:os";

const debug = Debug('chums:src:file-handlers');

export async function getLogFiles(options:LogParserOptions):Promise<string[]> {
    try {
        debug('getLogFiles() options', options);
        if (options.verbose) debug("getLogFiles()", "init")
        const files = await readdir(options.logPath);
        if (options.verbose) debug("getLogFiles()", `found: ${files.length} files`);
        const filenames = files
            .filter(f => f.endsWith('.log'))
            .filter(f => options.filter ? f.startsWith(options.filter) : true)
            .map(f => path.join(options.logPath, f))
        if (options.verbose) debug("getLogFiles()", `returning: ${files.length} files`);
        return filenames;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getLogFiles()", err.message);
            return Promise.reject(err);
        }
        debug("getLogFiles()", err);
        return Promise.reject(new Error('Error in getLogFiles()'));
    }
}

export async function readLogFile(file:string, options?:LogParserOptions):Promise<string> {
    try {
        if (options?.verbose) debug("readLogFile()", `init: ${file}`);
        const contents = await readFile(file, 'utf8');
        if (options?.verbose) debug("readLogFile()", `read: ${contents.length}`);
        return contents;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("readLogFile()", err.message);
            return Promise.reject(err);
        }
        debug("readLogFile()", err);
        return Promise.reject(new Error('Error in readLogFile()'));
    }
}

export async function writeTSV(file: string, data:ParseResultSet, options?:LogParserOptions):Promise<void> {
    try {
        const suffix = options?.deprecated ? '-deprecated' : '-stats';
        const filename = path.basename(file, '.log') + `${suffix}.tsv`;
        if (options?.verbose) debug("writeTSV()", `init: ${filename}`);
        const contents = Object.values(data).map(entry => {
            const {path, count, users, referrers} = entry;
            return [
                path,
                count,
                JSON.stringify(users),
                JSON.stringify(referrers),
            ].join('\t');
        })
        if (options?.verbose) debug("writeTSV()", `writing: ${contents.length}`);
        await writeFile(path.join(process.cwd(), './out', filename), contents.join(EOL));
        if (options?.verbose) debug("writeTSV()", `wrote: ${contents.length}`);
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("writeTSV()", err.message);
            return Promise.reject(err);
        }
        debug("writeTSV()", err);
        return Promise.reject(new Error('Error in writeTSV()'));
    }
}

export async function writeJSON(file: string, data:ParseResultSet, options?:LogParserOptions):Promise<void> {
    try {
        const suffix = options?.deprecated ? '-deprecated' : '-stats';
        const filename = path.basename(file, '.log') + `${suffix}.json`;
        if (options?.verbose) debug("writeJSON()", `init: ${filename}`);
        const contents = JSON.stringify(data, undefined, 2);
        if (options?.verbose) debug("writeJSON()", `writing: ${contents.length}`);
        await writeFile(path.join(process.cwd(), './out', filename), contents);
        if (options?.verbose) debug("writeJSON()", `wrote: ${contents.length}`);
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("writeJSON()", err.message);
            return Promise.reject(err);
        }
        debug("writeJSON()", err);
        return Promise.reject(new Error('Error in writeJSON()'));
    }
}
