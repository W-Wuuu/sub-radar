# ROBOT3 — 订阅雷达 SubRadar

## 当前状态
**Phase 1 生产运行中** — 数据监控模式
- 站点：https://radar-t.pages.dev/
- 仓库：github.com/W-Wuuu/sub-radar（main分支）
- 部署：git push → Cloudflare Pages 自动构建部署
- 邮件：Resend API 已配置，真实发信

## 三大功能
1. **查**：10平台取消教程搜索引擎（data/platforms.json）
2. **算**：订阅计算器（iframe嵌入）
3. **管**：到期邮件提醒（3次/月限额，Resend发信）

## 自动化管线
```
修改代码 → git push origin main → Cloudflare Pages 自动构建 → 站点更新
构建命令: node build.js | 输出目录: phase1/site | Analytics: 已开启
```

## 监控指标
- 预注册 ≥ 20人
- 用户授权比例 ≥ 50%（来自实验/调研）
- 达标 → 触发 Phase 2 汇报

## 决策契约
Claude提方案 → 用户批准/调整/否决 → Claude执行 → 周报同步

## 关键约束
- 零人工执行 · 全自动化 · 消费者导向
- 不涉及支付信息/短信权限
- 毛利率 >60%
