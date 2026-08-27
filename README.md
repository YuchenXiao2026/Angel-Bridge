# Angel Bridge

天使桥 Angel Bridge MVP：AI 原生价值匹配平台的可运行后端与产品原型。

## Run

```bash
npm start
```

默认监听 `http://localhost:3000`。数据暂存内存，重启后重置，适合黑客松 Demo；生产环境应替换为 PostgreSQL/Redis 与真实 AI provider。

## API

接口契约见 [`docs/openapi.yaml`](docs/openapi.yaml)，前端联调见 [`docs/frontend-integration-guide.md`](docs/frontend-integration-guide.md)。

```bash
npm test
```
