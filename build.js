/**
 * 订阅雷达 — Cloudflare Pages 构建脚本
 *
 * 当前站点为纯静态（HTML/CSS/JS），无需构建。
 * 此脚本作为 Cloudflare Pages 构建入口，未来可扩展：
 * - 平台教程库自动更新
 * - 内容索引生成
 * - 静态资源优化
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, 'phase1', 'site');

console.log('🔨 订阅雷达 · 构建开始');
console.log('═══════════════════════════');

// 验证关键文件存在
const required = ['index.html', 'calculator.html', 'data/platforms.json'];
let ok = true;
for (const f of required) {
  const filePath = path.join(SITE_DIR, f);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${f}`);
  } else {
    console.log(`  ❌ 缺失: ${f}`);
    ok = false;
  }
}

// 检查平台数量
try {
  const platforms = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'data', 'platforms.json'), 'utf8'));
  console.log(`  📚 平台教程: ${platforms.length} 个`);
} catch (e) {
  console.log('  ⚠️  平台数据解析失败');
}

console.log('═══════════════════════════');
if (ok) {
  console.log('✅ 构建完成 — 站点就绪');
} else {
  console.log('⚠️  构建完成 — 部分文件缺失，请检查');
  process.exit(1);
}
