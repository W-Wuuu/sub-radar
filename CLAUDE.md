# ROBOT3 — AI-Driven Digital Business Factory

## 项目定位
高度自动化、低人工、可复制、可持续盈利的数字生意孵化器。

## 当前阶段
**Phase 1** — 内容先行+虚拟MVP验证
- 站点上线：https://radar-t.pages.dev/
- 首选赛道：订阅雷达 SubRadar（S级 4.50）
- 当前任务：收集实验数据 → 验证付费意愿 → 虚拟MVP通过后进入开发

## 角色
- **用户（x1）**：架构师 + 决策者（每周最多2次决策，每次≤5分钟）
- **Claude（CEO-Agent）**：执行长，负责全部执行层工作

## 核心约束
1. 自动化优先：所有可自动化环节必须用AI/双Agent替代
2. 用户不参与执行（内容创作、客服、发帖、聊天、售后沟通等）
3. 技术困难先自行解决，仅战略级问题提交用户
4. 商业模式必须消费者导向：解决真实高频痛点，非流量收割
5. 毛利率目标 >60%

## 决策契约
Claude提方案 → 用户批准/调整/否决 → Claude执行 → Claude复盘汇报（自动化周报）

## 长期职责
- 每月提交商业模式优化建议
- 利润达阈值时提交扩张/新增/退出议案
- 持续关注消费者反馈并驱动迭代
- 道德/合规/品牌风险主动暂停并报告

## 架构约定
- 双Agent协作基座：Agent A（执行）+ Agent B（监控&优化）
- 站点发布：git push → Cloudflare Pages 自动部署
- 内容生产：Markdown → build.js → HTML
- 技术栈：静态站点 + 渐进增强
- 文档语言：中文为主，代码/配置可用英文

## 关键文件索引
- 评估框架：`01-business-model-evaluation-framework.md`
- 赛道筛选：`03-track-screening-report.md`
- 启动策略：`04-privacy-trust-and-launch-strategy.md`
- Phase 1 站点：`phase1/site/`
- Phase 1 进度：`phase1/phase1-progress.json`
- 虚拟MVP追踪：`phase1/virtual-mvp-tracker.md`
- 周报模板：`phase1/weekly-report-template.md`
- 双Agent设计：`dual-agent/agent-a-executor.md` + `dual-agent/agent-b-monitor.md`
