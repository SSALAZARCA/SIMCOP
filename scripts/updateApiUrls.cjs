const fs = require('fs');
const path = require('path');

const servicesDir = 'd:\\desarrollos 2\\simcop 3.0\\services';
const files = fs.readdirSync(servicesDir);

files.forEach(file => {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;

    const filePath = path.join(servicesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('http://localhost:8080')) {
        console.log(`Updating ${file}...`);

        // Add import
        if (!content.includes('../utils/apiConfig')) {
            content = "import { API_BASE_URL } from '../utils/apiConfig';\n" + content;
        }

        // Replace URLs - using a regex to handle both single and double quotes
        content = content.replace(/['"]http:\/\/localhost:8080(.*?)['"]/g, '`${API_BASE_URL}$1`');

        fs.writeFileSync(filePath, content);
    }
});
