# @vocab-agent/admin

后台管理系统（Web），基于 **React + Vite + Ant Design + ECharts**。

## 启动

```bash
pnpm install
pnpm --filter @vocab-agent/admin dev
# → http://localhost:5174
```

## 功能模块

| 模块 | 功能 |
|---|---|
| 概览 Dashboard | 关键指标 + 30 天活跃曲线 + 词书分布 |
| 词书管理 Wordbooks | 词书 CRUD、上下架 |
| 用户管理 Users | 用户列表、付费状态、封禁 |
| 数据分析 Analytics | 复习完成率、AI 渗透率、留存曲线 |
| 系统设置 Settings | LLM 配置、功能开关、运营配置 |

## 技术栈

- **React 18** + Vite + TypeScript
- **Ant Design 5** - UI 组件库
- **ECharts** - 数据可视化
- **React Router** - 路由
- **Zustand** - 状态管理（备用）

## 与主项目的连接

- 共享 `@vocab-agent/types`（领域模型）
- 通过 Vite proxy 转发 `/api/admin` 和 `/api/ai`
- 后端服务（NestJS Admin Service 或 FastAPI）通过 admin 鉴权后暴露接口

## 部署

```bash
pnpm --filter @vocab-agent/admin build
# 产物在 apps/admin/dist/
# 部署到 Nginx / CDN
```

## 待开发

- [ ] 真实后端接入（NestJS admin-service）
- [ ] 用户详情页
- [ ] 词书批量导入（CSV / ECDICT）
- [ ] 内容审核（用户反馈、违规词条）
- [ ] 财务模块（订单、退款）
- [ ] 推送通知