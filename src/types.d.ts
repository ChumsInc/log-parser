export interface LogParserOptions {
    logPath: string;
    verbose?: boolean;
    filter?: string;
    includeUsers?: boolean;
    includeReferrers?: boolean;
    output?: 'json' | 'tsv';
    outfile?: string;
    combined?: boolean;
    path?: string;
    deprecated?: boolean;
}


export interface ParseResult {
    path: string;
    count: number;
    users?: string[];
    referrers?: string[];
}

export type ParseResultSet = Record<string, ParseResult>;

export interface PM2LogEntry {
    timestamp: string;
    debugPath: string;
    ip: string;
    user: string;
    method: string;
    url: string;
    referrer: string;
}

export interface PM2DeprecationLogEntry {
    timestamp: string;
    debugPath: string;
    url: string;
    referrer: string;
}
