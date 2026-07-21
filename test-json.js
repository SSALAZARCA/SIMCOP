const extractAndRepairJson = (text) => {
    const start = text.indexOf('{');
    if (start === -1) return '';
    const stack = [];
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') stack.push('{');
        else if (ch === '[') stack.push('[');
        else if (ch === '}') {
            if (stack[stack.length - 1] === '{') stack.pop();
            if (stack.length === 0) return text.slice(start, i + 1);
        }
        else if (ch === ']') {
            if (stack[stack.length - 1] === '[') stack.pop();
        }
    }
    let repaired = text.slice(start);
    if (inString) repaired += '"';
    repaired = repaired.replace(/[,:]\s*$/, '');
    if (repaired.endsWith('"null')) repaired = repaired.replace(/"null$/, 'null');
    while (stack.length > 0) {
        const char = stack.pop();
        repaired += char === '{' ? '}' : ']';
    }
    return repaired;
};
console.log(extractAndRepairJson('{"a":"b"}'));
console.log(extractAndRepairJson('{"a":"b"'));
