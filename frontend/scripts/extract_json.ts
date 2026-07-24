import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockProposals, districtStats, mockDashboardStats, SEOUL_DISTRICTS } from '../src/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../src/data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write to JSON files
fs.writeFileSync(path.join(dataDir, 'mockProposals.json'), JSON.stringify(mockProposals, null, 2));
fs.writeFileSync(path.join(dataDir, 'districtStats.json'), JSON.stringify(districtStats, null, 2));
fs.writeFileSync(path.join(dataDir, 'mockDashboardStats.json'), JSON.stringify(mockDashboardStats, null, 2));
fs.writeFileSync(path.join(dataDir, 'seoulDistricts.json'), JSON.stringify(SEOUL_DISTRICTS, null, 2));

console.log('JSON extraction completed successfully!');
