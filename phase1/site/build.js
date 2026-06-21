/**
 * 订阅雷达 Site Builder
 *
 * 功能：将 content-library/ 中的 Markdown 内容自动生成为博客HTML页面。
 * 发布流程：node build.js → git add . → git commit → git push → Cloudflare Pages 自动部署。
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content-library');
const BLOG_DIR = path.join(__dirname, 'blog');
const SITE_DIR = __dirname;

// Ensure blog dir exists
if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });

// Simple markdown to HTML converter
function mdToHtml(md) {
  let html = md;

  // Remove YAML frontmatter (between first two ---)
  html = html.replace(/^---[\s\S]*?---\n*/, '');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^(\s*)[-\*] (.+)$/gm, (_, indent, text) => {
    return `${indent}<li>${text}</li>`;
  });

  // Ordered lists
  html = html.replace(/^(\s*)\d+\. (.+)$/gm, (_, indent, text) => {
    return `${indent}<li>${text}</li>`;
  });

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
    return `\n<ul>\n${match}</ul>\n`;
  });

  // Tables (simple pipe tables)
  html = html.replace(/^\|(.+)\|$/gm, (line) => {
    const cells = line.split('|').filter(c => c.trim());
    if (line.includes('---')) return ''; // Skip separator rows
    const tag = line.includes('**') || line.match(/^\|[\s\-|]+$/m) ? 'th' : 'td';
    return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
  });
  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Emoji (keep as-is, browsers handle them)

  // Paragraphs: wrap non-tag lines in <p>
  const lines = html.split('\n');
  let result = [];
  let inList = false, inTable = false, inBlockquote = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      result.push('');
      inList = false;
      continue;
    }

    // Don't wrap HTML tags
    if (trimmed.match(/^<(\/?(h[1-4]|ul|ol|li|table|tr|t[hd]|hr|blockquote|strong|em|code|p|br|div))/)) {
      result.push(line);
      continue;
    }

    // Don't wrap lines that are already inside tags
    if (trimmed.startsWith('<')) {
      result.push(line);
      continue;
    }

    // Wrap in paragraph
    result.push(`<p>${line}</p>`);
  }

  html = result.join('\n');

  return html;
}

// HTML page template
function pageTemplate(title, body, description) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — 订阅雷达</title>
<meta name="description" content="${description || title}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description || title}">
<style>
  :root {
    --primary: #6C5CE7;
    --text: #2D3436;
    --text-secondary: #636E72;
    --bg: #F8F9FA;
    --card: #FFFFFF;
    --border: #DFE6E9;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.8;
  }
  nav {
    background: white; border-bottom:1px solid var(--border); padding:14px 24px;
    position:sticky; top:0; z-index:100;
  }
  nav a { color:var(--primary); text-decoration:none; font-weight:700; font-size:16px; }
  article {
    max-width: 720px; margin: 40px auto; padding: 0 20px;
  }
  article h1 { font-size: 30px; margin: 24px 0 12px; font-weight: 800; }
  article h2 { font-size: 22px; margin: 32px 0 12px; font-weight: 700; color: var(--primary); }
  article h3 { font-size: 18px; margin: 24px 0 8px; font-weight: 700; }
  article h4 { font-size: 16px; margin: 16px 0 6px; }
  article p { margin: 12px 0; font-size: 16px; }
  article ul, article ol { margin: 12px 0 12px 24px; }
  article li { margin: 6px 0; font-size: 16px; }
  article table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
  article table td, article table th { border:1px solid var(--border); padding:8px 12px; text-align:left; }
  article table th { background: #F0EDFF; font-weight:700; }
  article blockquote {
    border-left:4px solid var(--primary); padding:8px 16px;
    margin:16px 0; background:white; border-radius:0 8px 8px 0;
    color: var(--text-secondary);
  }
  article code { background:#EDE7F6; padding:2px 6px; border-radius:4px; font-size:14px; }
  article hr { border:none; border-top:1px solid var(--border); margin:32px 0; }
  article strong { color: var(--text); }
  article a { color: var(--primary); }
  .back-link { display:inline-block; margin-top:40px; color:var(--primary); text-decoration:none; font-weight:600; }
  .back-link:hover { text-decoration:underline; }
  footer {
    text-align:center; padding:32px 20px; color:var(--text-secondary);
    font-size:13px; border-top:1px solid var(--border); margin-top:40px;
  }
  footer a { color:var(--primary); text-decoration:none; }
  @media (max-width:640px) {
    article h1 { font-size:24px; }
    article p, article li { font-size:15px; }
  }
</style>
</head>
<body>
<nav><a href="/">← 订阅雷达首页</a></nav>
<article>
${body}
<a href="/" class="back-link">← 回到首页</a>
</article>
<footer>
  <p>© 2026 <a href="/">订阅雷达 SubRadar</a> · 数据仅保存在你的设备上</p>
</footer>
</body>
</html>`;
}

// Blog article mapping: content source → output filename
const BLOG_MAP = [
  { src: 'xiaohongshu/xhs-02-wechat-cancel-tutorial.md', dest: 'wechat-tutorial.html', title: '微信自动续费关闭教程' },
  { src: 'zhihu/zh-02-subscription-spending-calculator.md', dest: 'subscription-spending.html', title: '普通中国年轻人一年在订阅上花多少钱？' },
  { src: 'xiaohongshu/xhs-03-3000-hidden-subs.md', dest: '3000-hidden-subs.html', title: '我翻了12个月支付记录，发现3000块隐形订阅' },
  { src: 'xiaohongshu/xhs-04-alipay-cancel-tutorial.md', dest: 'alipay-tutorial.html', title: '支付宝自动扣款管理完整指南' },
  { src: 'zhihu/zh-03-subscription-fatigue.md', dest: 'subscription-fatigue.html', title: '订阅疲劳：一个被忽视的中国消费者困境' },
  { src: 'zhihu/zh-05-platform-management-guide.md', dest: 'platform-guide.html', title: '四个你必须定期检查的自动扣费入口' },
  { src: 'xiaohongshu/xhs-05-video-comparison.md', dest: 'video-comparison.html', title: '视频会员怎么选最省钱？' },
  { src: 'xiaohongshu/xhs-08-ios-subscription-tutorial.md', dest: 'ios-tutorial.html', title: 'iOS用户必看：App Store订阅管理' },
  { src: 'xiaohongshu/xhs-10-regulation-good-news.md', dest: 'regulation.html', title: '自动续费新规全面解读' },
];

// Build all blog pages
let built = 0;
BLOG_MAP.forEach(({ src, dest, title }) => {
  const srcPath = path.join(CONTENT_DIR, src);
  const destPath = path.join(BLOG_DIR, dest);

  if (!fs.existsSync(srcPath)) {
    console.log(`⚠️  跳过（源文件不存在）: ${src}`);
    return;
  }

  const md = fs.readFileSync(srcPath, 'utf8');
  const bodyHtml = mdToHtml(md);
  const desc = title;
  const html = pageTemplate(title, bodyHtml, desc);

  fs.writeFileSync(destPath, html);
  console.log(`✅ ${dest}`);
  built++;
});

// Copy calculator.html (already done by user)
console.log(`\n📊 博客文章: ${built} 篇已生成`);
console.log(`📂 输出目录: ${BLOG_DIR}`);
console.log(`\n🚀 发布: git add . && git commit -m "content update" && git push`);
console.log(`   Cloudflare Pages 将自动检测推送并部署。`);
