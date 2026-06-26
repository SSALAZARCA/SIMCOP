const fs = require('fs');
const path = require('path');

const servicesDir = 'd:\\desarrollos 2\\simcop 3.0\\services';
const files = fs.readdirSync(servicesDir);

console.log(`Found ${files.length} files in ${servicesDir}`);

files.forEach(file => {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;

    const filePath = path.join(servicesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('http://localhost:8080')) {
        console.log(`Updating ${file}...`);

        // Add import at the top
        if (!content.includes("from '../utils/apiConfig'")) {
            content = "import { API_BASE_URL } from '../utils/apiConfig';\n" + content;
        }

        // Replace URLs
        const newContent = content.replace(/['"]http:\/\/localhost:8080(.*?)['"]/g, '`${API_BASE_URL}$1`');

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Successfully updated ${file}`);
        } else {
            console.log(`Regex did not match in ${file}`);
        }
    }
});
