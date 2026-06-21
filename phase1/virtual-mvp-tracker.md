# 虚拟MVP验证追踪器

> 自动更新于部署时。数据来源：Cloudflare Pages Analytics + 实验页面 localStorage 统计。

## 验证指标

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 站点总PV（7天） | 待Cloudflare Analytics | > 100 | ⏳ |
| 计算器使用次数 | 待统计 | > 50 | ⏳ |
| 实验完成率 | 待统计 | > 30% | ⏳ |
| "愿意授权"比例 | 待统计 | > 50% | ⏳ |
| 预注册人数 | 待统计 | > 20 | ⏳ |
| 付费意愿（≥¥5/月） | 待统计 | > 40% | ⏳ |

## 验证通过标准

虚拟MVP验证通过 = 以下3项全部达标：
1. ✅ 实验完成人数 ≥ 30
2. ✅ "愿意授权"比例 ≥ 50%（含"愿意但需了解隐私保护"）
3. ✅ 预注册 ≥ 20 人

## 数据收集方式

- **站点流量**: Cloudflare Pages Analytics（需在Cloudflare Dashboard开启）
- **实验数据**: 存储在用户浏览器的 localStorage 中（`subradar_experiment` key）
- **预注册**: 存储在用户浏览器的 localStorage 中（`subradar_preregs` key）
- **聚合方式**: 用户数据仅在本地。需通过可选的回传机制（未来添加）或手动抽样统计。

## 更新频率

每次 git push 部署时可更新此文件。实际指标数据依赖用户主动反馈或 analytics 接入。
