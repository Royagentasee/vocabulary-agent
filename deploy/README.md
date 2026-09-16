# 部署脚本

这些脚本通过 SSH（paramiko）把代码部署到线上服务器、跑诊断、抓取官方真题。

## 前置：设置环境变量

**服务器密码不再写死在脚本里**，必须通过环境变量 `VOCAB_SSH_PASSWORD` 传入。

PowerShell（当前会话有效）：

```powershell
$env:VOCAB_SSH_PASSWORD = "你的服务器密码"
```

想永久生效（写进用户环境变量）：

```powershell
[Environment]::SetEnvironmentVariable("VOCAB_SSH_PASSWORD", "你的服务器密码", "User")
```

> ⚠️ 千万不要把密码写进任何会被提交的文件里。`.env*` 已在 `.gitignore` 中。

## 常用脚本

| 脚本 | 作用 |
|---|---|
| `deploy_all.py` | **全量部署**（推荐）：同步整个 `app/` + 前端 `dist/`，更新 nginx 配置，重启服务并验证 |
| `deploy_reading.py` | 只部署真题库相关文件（阅读 / 写作题库） |
| `upload_dist.py` | 只上传前端 `dist/` |
| `init_db.py` | 在服务器上初始化 SQLite 并导入词库 |
| `diag_external.py` | 诊断外网访问（公网 IP / 监听端口 / 防火墙 / DNS） |
| `diag_logs.py` | 拉取并分析 nginx 访问/错误日志 |
| `fetch_official.py` | 测试官方站点可达性 |
| `fix_deploy*.py` / `ssh_diag.py` | 历史一次性修复脚本（保留作参考） |

## 用法示例

```powershell
$env:VOCAB_SSH_PASSWORD = "你的服务器密码"
python deploy\deploy_all.py
```

## 改成自己的服务器

脚本顶部的 `HOST` / `USER` / `REMOTE_DIR` 按需修改：

```python
HOST = 'agents.earthledger.com'   # 你的服务器域名或 IP
USER = 'ubuntu'                    # SSH 用户名
REMOTE_DIR = '/home/ubuntu/vocab-agent'
```

## 服务器上的目录结构

```
/home/ubuntu/vocab-agent/
├── app/                    # FastAPI 后端
├── packages/               # SDK
├── seed/words.csv          # 词库
├── dist/                   # 前端构建产物
├── data/vocab_agent.db     # SQLite
└── .env                    # 线上密钥（不要提交）
```
