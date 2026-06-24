// 订阅雷达 Cloudflare Pages 构建脚本
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'phase1', 'site');

console.log('Build start');
const ok = ['index.html','calculator.html','data/platforms.json'].every(f => {
  const exists = fs.existsSync(path.join(dir, f));
  console.log(exists ? 'OK ' + f : 'MISSING ' + f);
  return exists;
});
if (!ok) { console.error('Build failed: missing files'); process.exit(1); }
try {
  const p = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'platforms.json'), 'utf8'));
  console.log('Platforms: ' + p.length);
} catch(e) { console.error('JSON parse error: ' + e.message); process.exit(1); }
console.log('Build done');
