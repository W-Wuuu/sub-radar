/**
 * 订阅雷达 Phase 1 — 发布管线调度器
 *
 * 功能：
 * 1. 读取 content-calendar.json → 检查今日应发布内容
 * 2. 读取对应内容文件 → 生成发布清单
 * 3. 输出发布指令（人工最终确认后发布）
 *
 * 使用：node publish-scheduler.js
 * 输出：今日待发布清单 + 内容预览
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONTENT_DIR = path.join(__dirname, '..', 'content-library');
const CALENDAR_FILE = path.join(__dirname, '..', 'content-engine', 'content-calendar.json');
const LOG_FILE = path.join(__dirname, 'publish-log.json');

// Channel emoji mapping
const CHANNEL_EMOJI = {
  xiaohongshu: '📕 小红书',
  zhihu: '🔷 知乎',
  wechat_mp: '🟢 公众号'
};

// Platform-specific posting instructions
const POSTING_INSTRUCTIONS = {
  xiaohongshu: {
    step1: '打开小红书App → 点击底部"+"号',
    step2: '选择图片（按配图方案准备）',
    step3: '粘贴正文内容',
    step4: '添加标签（按内容文件中的标签列表添加）',
    step5: '选择发布地点（可选）→ 发布',
    bestTime: '12:00-14:00 或 18:00-22:00',
    note: '图片比例建议 3:4，首图最重要（带标题文字）'
  },
  zhihu: {
    step1: '打开知乎 → 搜索目标问题',
    step2: '点击"写回答"',
    step3: '粘贴正文内容（支持Markdown格式）',
    step4: '添加话题标签（2-3个精准话题）',
    step5: '检查格式 → 发布',
    bestTime: '10:00-12:00 或 20:00-23:00',
    note: '如果回答已有高赞回答，评估是否值得回答。长文也可以发布为"文章"。'
  },
  wechat_mp: {
    step1: '登录公众号后台 → 素材管理 → 新建图文',
    step2: '粘贴标题和正文',
    step3: '上传封面图（2.35:1 比例）',
    step4: '添加摘要（120字以内）',
    step5: '预览 → 群发',
    bestTime: '08:00-09:00 或 21:00-22:00',
    note: '公众号每天只能群发1次，提前24小时准备。粉丝少时可用"发布"（不占用群发次数）。'
  }
};

// Load calendar
function loadCalendar() {
  try {
    const data = fs.readFileSync(CALENDAR_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ 无法加载内容日历:', err.message);
    process.exit(1);
  }
}

// Get today's schedule
function getTodaySchedule(calendar) {
  const today = new Date().toISOString().split('T')[0];
  return calendar.daily_schedule.find(d => d.date === today);
}

// Find content files for a channel
function findContentFiles(channel, date) {
  const channelDir = path.join(CONTENT_DIR, channel);
  if (!fs.existsSync(channelDir)) return [];

  const files = fs.readdirSync(channelDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(channelDir, f));

  // In a real system, we'd match by date/ID. For now, list available files.
  return files;
}

// Parse content preview
function getContentPreview(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Extract title (first H1 after metadata block)
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

    // Extract first 200 chars of body (skip metadata)
    const bodyStart = content.indexOf('## 正文');
    const preview = bodyStart !== -1
      ? content.substring(bodyStart + 6, bodyStart + 206).replace(/#/g, '').trim()
      : content.substring(0, 200);

    // Count words
    const wordCount = content.replace(/[#\*\-\|\>\`\s]/g, '').length;

    return { title, preview, wordCount, filePath };
  } catch (err) {
    return { title: '未知', preview: '', wordCount: 0, filePath };
  }
}

// Generate publish log entry
function updatePublishLog(entry) {
  let log = [];
  try {
    if (fs.existsSync(LOG_FILE)) {
      log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
  } catch (err) { /* start fresh */ }

  log.push({
    ...entry,
    timestamp: new Date().toISOString()
  });

  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// Main
function main() {
  console.log('═══════════════════════════════════════');
  console.log('📡 订阅雷达 · 发布管线调度器');
  console.log('═══════════════════════════════════════\n');

  const calendar = loadCalendar();
  const today = getTodaySchedule(calendar);

  if (!today) {
    console.log('📅 今日无计划发布内容。');
    console.log(`   日历范围：${calendar.start_date} ~ ${calendar.end_date}`);
    return;
  }

  console.log(`📅 ${today.date} | 主题：${today.theme}`);
  console.log('───────────────────────────────────────\n');

  const tasks = [];

  // Check each channel
  for (const [channel, topic] of Object.entries(today)) {
    if (channel === 'date' || channel === 'theme' || !topic) continue;

    const emoji = CHANNEL_EMOJI[channel] || channel;
    console.log(`${emoji}: ${topic}`);
    console.log(`   发布指引：${POSTING_INSTRUCTIONS[channel]?.bestTime || '随时'}`);
    console.log(`   注意事项：${POSTING_INSTRUCTIONS[channel]?.note || '无'}\n`);

    tasks.push({
      channel,
      topic,
      instructions: POSTING_INSTRUCTIONS[channel],
      contentFiles: findContentFiles(channel, today.date)
    });
  }

  // Summary
  console.log('───────────────────────────────────────');
  console.log(`📊 今日发布任务：${tasks.length} 条`);
  console.log('───────────────────────────────────────');
  console.log('\n⚡ 操作流程：');
  console.log('1. 打开对应内容文件（content-library/{channel}/）');
  console.log('2. 按配图方案准备图片');
  console.log('3. 按平台指引发布');
  console.log('4. 发布完成后运行: node publish-scheduler.js --log-complete');
  console.log('\n💡 提示：内容发布后，24小时/48小时/7天后检查互动数据。');
  console.log('   互动数据记录到 analytics/engagement-tracker.json\n');

  return tasks;
}

// Run
const tasks = main();

// Export for use in other scripts
module.exports = { tasks, getTodaySchedule, loadCalendar };
