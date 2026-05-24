const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (file.endsWith('.jsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('./src/pages');

let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Check if it already has /** ... */
  if (content.includes('/**')) {
    continue;
  }

  const match = content.match(/export default function (\w+)\s*\(/);
  if (match) {
    const compName = match[1];
    
    // Create JSDoc based on component name
    const jsdoc = `/**
 * Widok modułu ${compName}.
 * 
 * Komponent prezentacyjny (Page) w strukturze aplikacji SklepXD.
 * Odpowiada za wyświetlanie interfejsu powiązanego z ${compName.replace('Page', '')}.
 * Zawiera standardową logikę zarządzania stanem oraz interakcję z globalnym StoreContext/AuthContext.
 * 
 * @returns {JSX.Element} Widok strony ${compName}
 */\n`;

    content = content.replace(/export default function \w+\s*\(/, match => jsdoc + match);
    fs.writeFileSync(file, content);
    console.log(`Zaktualizowano: ${file}`);
    modifiedCount++;
  }
}

console.log(`Dodano JSDoc do ${modifiedCount} plików.`);
