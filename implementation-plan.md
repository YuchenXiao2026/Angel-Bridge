# Angel Bridge MVP 实施方案

## 范围

以黑客松 Demo 的最小闭环为目标：用户初始化、价值画像、价值卡、心愿解析、候选匹配、连接、轻量消息、灵宠与成长、首页聚合。

## 架构

当前采用零依赖 Node.js 模块化单体和 REST API，内存数据用于快速演示；HTTP Handler 负责输入输出，业务规则集中在服务入口，数据集合模拟 Repository。生产版本再拆分模块并接入 PostgreSQL、Redis、Embedding 与 LLM。

## 安全与上线差距

Demo 阶段限制 1MB JSON 请求并校验关键字段。上线前必须增加 JWT 身份认证、对象级授权、限流、数据库迁移、密钥外部化、日志与监控，并用真实 AI provider 替换启发式解析。

## 验收

- `npm test` 通过
- `/health` 与 `/ready` 可用
- OpenAPI 和前端联调指南齐全
- 前端原型与后端代码位于同一仓库
