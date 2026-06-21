# Agent A — 执行层 设计文档

## 角色
业务执行者。负责内容生产、站点构建、发布部署、用户触达。

## 核心职责

| 职责 | 触发方式 | 自动化程度 |
|------|---------|-----------|
| 内容生产 | 按日历 / 手动触发 | 100%（AI写作） |
| 站点构建 | git push | 100%（build.js → Cloudflare Pages） |
| SEO优化 | 每次内容更新 | 90%（sitemap/robots/meta 自动生成） |
| 用户触达 | 预注册用户通知 | 待Phase 2实现（Resend API） |
| 实验数据分析 | 每周 | 80%（数据聚合 → 人工解读） |

## 工作流

```
触发（日历/手动）
    │
    ▼
内容生产（AI写作 Markdown）
    │
    ▼
node build.js（Markdown → HTML）
    │
    ▼
git commit + push
    │
    ▼
Cloudflare Pages 自动部署
    │
    ▼
更新 phase1-progress.json
```

## 当前工具链

| 工具 | 用途 | 状态 |
|------|------|------|
| Claude | 内容生成 + 代码编写 | ✅ 已接入 |
| Node.js build.js | 静态站点构建 | ✅ 已就绪 |
| Cloudflare Pages | 托管 + 自动部署 | ✅ 已部署 |
| Git | 版本控制 + 部署触发 | ✅ 已初始化 |

## 待接入（Phase 2+）

| 工具 | 用途 |
|------|------|
| Resend / SendGrid | 预注册用户邮件通知 |
| Cloudflare Analytics API | 自动拉取流量数据 |
| Supabase | 用户数据存储（替代localStorage） |
