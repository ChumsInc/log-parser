export function parseEOL (contents: string):string {
    if (contents.includes('\r\n')) return '\r\n';
    if (contents.includes('\n')) return '\n';
    return '\r\n';
}
