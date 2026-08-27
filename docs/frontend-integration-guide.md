# 前端联调指南

启动 API 后，所有接口使用 `http://localhost:3000`，请求和响应均为 JSON。Demo 用户 ID 为 `user_demo`，可直接调用 `GET /api/home?user_id=user_demo`。

典型流程：`POST /api/ai/parse-wish` → 用户确认字段 → `POST /api/wishes` → `GET /api/wishes/{id}/matches` → `POST /api/connections` → 消息接口。

当前版本无登录、WebSocket、持久化和真实 LLM；发布前应接入 JWT、数据库、限流和 AI provider。
