import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'public', 'data');
const outputFile = path.join(dataDir, 'files.json');

try {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Scan only .txt files, sort them alphabetically descending (newest/highest unit first)
  const files = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.txt') && file !== 'files.json')
    .sort()
    .reverse();

  fs.writeFileSync(outputFile, JSON.stringify(files, null, 2), 'utf8');
  console.log(`Successfully generated static index file: ${outputFile}`);
  console.log(`Files found:`, files);
} catch (error) {
  console.error('Failed to generate files.json index:', error);
  process.exit(1);
}
