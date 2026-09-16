# @vocab-agent/admin-service

后台管理后端，**NestJS + TypeORM + JWT**。

## 启动

```bash
# 在 monorepo 根目录
pnpm install
pnpm --filter @vocab-agent/admin-service dev
# → http://localhost:8001
# → Swagger: http://localhost:8001/api/admin/docs
```

## 数据库初始化

需要在 `admin_users` 表插入初始管理员：

```sql
-- 密码：vocab2026（bcrypt 哈希）
INSERT INTO admin_users (email, password_hash, name, role) VALUES
('admin@vocabulary-agent.com', '$2a$10$...', 'Admin', 'super_admin');
```

可用脚本：

```bash
node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('vocab2026', 10));
"
```

## 接口

| 路径 | 方法 | 权限 | 说明 |
|---|---|---|---|
| `/auth/login` | POST | 公开 | 登录获取 JWT |
| `/auth/me` | GET | 已登录 | 当前用户信息 |
| `/wordbooks` | GET | 已登录 | 词书列表（分页） |
| `/wordbooks/stats` | GET | 已登录 | 词书分布统计 |
| `/wordbooks` | POST | admin+ | 新建 |
| `/wordbooks/:id` | PATCH | admin+ | 更新 |
| `/wordbooks/:id` | DELETE | admin+ | 删除 |
| `/users` | GET | 已登录 | 用户列表 |
| `/users/stats` | GET | 已登录 | 用户统计 |
| `/analytics/overview` | GET | 已登录 | 数据概览 |
| `/analytics/active-users?days=30` | GET | 已登录 | 活跃用户 |
| `/settings` | GET | admin+ | 系统设置 |
| `/settings` | PUT | super_admin | 更新设置 |

## 角色

| Role | 权限 |
|---|---|
| `super_admin` | 全部 |
| `admin` | CRUD 词书 / 设置（不含 settings）|
| `editor` | 只读 + 编辑词书内容 |
| `viewer` | 只读 |

## 环境变量

```bash
PORT=8001
DATABASE_URL=postgres://vocab:vocab@localhost:5432/vocab_agent
JWT_SECRET=please-change-me-in-production
NODE_ENV=development
```