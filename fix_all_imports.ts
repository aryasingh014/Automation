import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src', 'components');

fs.readdirSync(componentsDir).forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("@/src/")) {
      content = content.replace(/@\/src\//g, '../');
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${file}`);
    }
  }
});
