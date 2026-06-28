import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/gemini-1\.5-flash/g, 'gemini-2.5-flash');
fs.writeFileSync('server.ts', code);
console.log('Replaced all gemini-1.5-flash with gemini-2.5-flash');
