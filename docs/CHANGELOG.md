# 需求讨论与变更记录

> 包含需求讨论、架构决策、版本变更。最新条目在前。

## v0.13.4 — 每日背词数量自定义 + 上云准备
- ✅ 学习页加「每日背词数量」选择器（5/10/15/20/30/50）
- ✅ store 加 dailyGoal 字段 + setDailyGoal action（持久化）
- ✅ fetchWords 支持 limit 参数
- ✅ 修复 web Dockerfile（vite 直接构建 + 去重 COPY）
- ✅ `docs/上云部署-小白版.md`：面向小白的完整上云步骤

## v0.13.3 — 阅读理解功能
- ✅ 后端 `POST /api/ai/reading`：文章 → AI 出阅读理解题（摘要 + 3 题选择题）
- ✅ 题型覆盖：主旨 / 细节 / 词汇 / 推断
- ✅ mock fallback（AI 不可用时模板出题）
- ✅ 前端 ReadingPage：粘贴文章 + 选题目数 + 答题 + 解析

## v0.13.2 — 上云部署（生产环境）
- ✅ `docker-compose.prod.yml`：ai-gateway + web 两服务编排
- ✅ 修复 ai-gateway Dockerfile（打包本地 SDK + 种子数据自动初始化）
- ✅ `apps/web/Dockerfile` + `nginx.conf`：前端打包 + 反代 API
- ✅ `entrypoint.sh`：首次启动自动导入 494 词种子数据
- ✅ `.env.production.example` + `.dockerignore`
- ✅ 重写 deploy-aliyun.sh 匹配简化架构
- ✅ `docs/CLOUD-DEPLOY.md`：完整上云指南（买服务器→部署→域名 HTTPS）

## v0.13.1 — 写作助手功能
- ✅ 后端 `POST /api/ai/writing`：主题 + 指定词 → AI 生成短文（加粗标记用到的词）
- ✅ mock fallback（AI 不可用时本地模板生成）
- ✅ 前端 WritingPage：输入主题 + 用最近学过的词 + 生成
- ✅ `**word**` 高亮渲染
- 🎉 DeepSeek 余额已恢复，AI 解释/出题/写作全部返回真实内容

## v0.13.0 — 词根词缀功能
- ✅ `word_roots.py`：150+ 高频词 + GRE 核心词的词根词缀拆解数据
- ✅ 后端 `ExplainResponse` 加 `root_affix` 字段（prefix/root/suffix + 含义）
- ✅ `mock_data` 用词根拆解生成 etymology（如 "computer = com- + put + -er"）
- ✅ 前端 `AIExplainPanel` 结构化展示「词根词缀拆解」卡片
- ✅ 共享类型 `RootAffix` + `Word.rootAffix`

## v0.12.3 — 错题本「重做错词」功能
- ✅ `startReviewWrongWords` action：把错题本所有词装入复习队列
- ✅ `reviewRate` 选对（Good/Easy/Hard）自动从错题本移除
- ✅ WrongbookPage 加「📖 重做错词」按钮 → 跳复习页

## v0.12.2 — AI Mock Fallback
- ✅ `mock_data.py`：DeepSeek 出错时 fallback 到本地模板
- ✅ `explain` 自动用 DB 里的 pos/translation 生成像样的解释
- ✅ `quiz` 自动用词性和翻译生成 4 选 1 选择题
- ✅ 543 个词都有 fallback 内容，前端用户体验不受影响
- ✅ 强制 mock 模式：环境变量 `USE_AI_MOCK=true`

## v0.12.1 — AI 错误处理改进
- ✅ 完善 `explain` service 错误处理：识别 Insufficient Balance / Auth / timeout 等
- ✅ 完善 `quiz` service 错误处理：捕获 LLM 调用异常（之前只 catch JSON 解析错）
- ✅ 错误信息友好化：「AI 服务余额不足，请联系管理员充值」等
- ✅ 前端能看到具体错误原因（不再只是"服务异常"）

## 2025-XX-XX 第 3 轮：技术选型全部落地（按推荐方案）
- 跨端：React Native（Mobile）+ Taro 3（Mini）+ Tauri（Desktop）
- 后端：Node.js + NestJS（API）+ Python + FastAPI（AI）
- 数据：PostgreSQL + pgvector + Redis
- LLM：DeepSeek（主力）+ 智谱 GLM（备选）
- Monorepo：pnpm workspaces + Turborepo
- 鉴权：JWT + 第三方登录
- 部署：Docker + 公有云
- 详见 `docs/ADR.md`（ADR-0001 ~ ADR-0010 全部 ✅ 决议）

## 2025-XX-XX 第 2 轮：MVP 范围拍板（v0.5）
- 背词：仅「看英忆中」
- 词书：高频 5000 + 1 本官方词书
- AI：AI 释义 / 详解 + AI 错因归因（造例、语音陪练推迟）
- 激励：打卡 + 连击 + 考试倒计时 + 错词本
- 数据：记忆曲线（简版折线图）
- 平台：Web（PWA）单端
- 工期：8–10 周
- 验收：7 日留存 ≥ 45%、AI 渗透 ≥ 50%、词书付费转化 ≥ 8%、复习完成率 ≥ 65%

## 2025-XX-XX 第 1 轮：四维度拍板
- 目标用户：高阶英语学习者（雅思 / 托福 / GRE / SAT）
- 定位：AI 个性化辅导型
- 调性：科技极简（专业型）
- 平台：Web（PWA）+ iOS/Android + 小程序 + 桌面端
- 文档：单份 Markdown PRD

---

# 工程 Changelog

## v0.12.0 — 错题本
- ✅ 错题本页面（/wrongbook）：列出所有错词 + 错误次数 + 最后答错时间
- ✅ 错词结构升级：记录 wrongCount（错误次数），答错自动累加
- ✅ 单个错词可「✓ 掌握」移出，支持「清空错题本」
- ✅ 错词按错误次数排序（错得多的排前面）
- ✅ 首页/导航/统计页接入错题本

## v0.11.0 — 学习/复习模块拆分
- ✅ 学习模块（/learn）：每天学新词，学完加入"已学词池"（含 FSRS 状态）
- ✅ 复习模块（/review）：从已学词池按 FSRS 到期时间抽取 + 不足时随机补足
- ✅ 抽出共用组件 LearningCard（选意思 + 看解释 + 评分）
- ✅ 首页区分「学习新词」和「复习旧词」两个入口
- ✅ learnStore 重构：learnedWords 持久化（词 + FSRS 卡片状态）

## v0.10.0 — 复习流程升级：先选意思再看解释
- ✅ 后端新增 `GET /api/words/meaning-quiz?headword=xxx`（选释义 4 选 1）
- ✅ 干扰项从词库随机取其他词翻译（不依赖 AI，响应快）
- ✅ 前端复习页重构：先出 4 选 1 选中文释义，选对/错自动评分
- ✅ "💡 实在不懂，看解释"按钮 → 看 AI 解释后手动评分
- ✅ 选对自动评 Good，选错自动评 Again，1.2 秒后自动进入下一词

## v0.9.0 — 修复"每天相同 8 词"问题
- 🐛 修复：前端一直用硬编码 8 个 MOCK_WORDS，无法学新词
- ✅ 后端新增 `GET /api/words/random?limit=N&exclude=ids`（随机取词 + 排除已学）
- ✅ 前端 `fetchWords()` 改为从后端随机取 20 个词（失败 fallback mock）
- ✅ `learnStore` 记录 learnedIds，每次取词排除已学过的
- ✅ persist migrate v2：旧用户清空旧 8 词队列，重新取词
- ✅ 重新生成高质量离线词库：543 个纯英文词 + 正确中文翻译
- ✅ 小程序端同样接入后端随机取词

## v0.8.0 — 数据扩展 + AI 出题
- ✅ 离线词库：2089 个 unique 词（网络不通时的兜底方案）
- ✅ 修复 AI 网关 DB 路径问题（相对路径 → 绝对路径）
- ✅ AI 出题功能：`POST /api/ai/quiz/generate`（完形填空 4 选 1）
- ✅ Web 端 QuizPanel（复习页内嵌）+ 小程序 QuizPanel
- ✅ 综合 e2e 测试（13/13 通过，含 7 词搜索 + 3 词 AI 解释）
- ✅ 防火墙规则脚本（open-ports.ps1，5173/8000/3001/5174）

## v0.7.0 — 上线行动落地
### P0（必须）
- ✅ ECDICT 自动下载器（download_ecdict.py + 多源镜像）
- ✅ AI 网关 .env 自动检查 + 修复（tools/env-check.py）
- ✅ 端到端验证脚本（tools/e2e-check.py）
- ✅ AppID 申请流程清单（tools/appid-checklist.md）

### P1（应该）
- ✅ 阿里云一键部署脚本（tools/deploy/deploy-aliyun.sh）：Docker + Nginx + Let's Encrypt + 自动备份
- ✅ 小程序提交审核助手（submit-mini.mjs）：编译 + 截图 + 审核清单 + 自动上传
- ✅ iOS TestFlight 自动化脚本（eas-ios.mjs）：EAS CLI + 凭据配置 + 构建 + 提交

### P2（可以）
- ✅ A/B 测试实验设计文档（AB-EXPERIMENTS.md）：4 个实验 + 假设 + 指标 + 流量分配
- ✅ 数据看板启用 + 告警配置（ALERTING.md）
- ✅ Prometheus metrics 端点（ai-gateway /metrics）
- ✅ Prometheus 告警规则（infra/prometheus/alerts.yml）

## v0.6.0 — 上线准备
- ✅ 真实数据接入：AI 网关词条查询 API（PostgreSQL tsvector + pgvector RAG）/ SQLite fallback
- ✅ 提审工具集：Playwright 自动截图 + 审核清单自动检查 + 一键打包
- ✅ 生产部署指南：阿里云 + HTTPS + ICP + Docker Compose + Nginx + 监控
- ✅ 性能优化：Redis AI 响应缓存（24h TTL）+ 限流中间件（100次/小时）
- ✅ iOS 上架指南（APP-STORE-PUBLISH.md）：EAS iOS build + TestFlight + App Store 完整流程
- ✅ 数据看板增强：用户漏斗 / 同期群留存热力图 / 营收分析 / 功能渗透率

## v0.5.0 — 后端 + 平台扩展
- ✅ admin-service（NestJS + JWT + TypeORM，5 个模块 + Swagger）
- ✅ admin 前端接入真实后端（JWT 登录 + Token 持久化 + 自动跳转）
- ✅ AI 网关新增 voice 模块（ASR / TTS / 发音评分）
- ✅ 小程序 VoiceRecorder 组件（基于 Taro RecorderManager）
- ✅ Desktop Tauri 2 完整实现（含 Rust commands + Vite + Tailwind）
- ✅ @vocab-agent/sdk-ab：A/B 测试 SDK（哈希分桶 + 灰度 + 强制列表）
- ✅ 小程序分包加载：主包只保留核心流程，AI 功能和大词库走分包

## v0.4.0 — V1.0 高级功能
- ✅ UI 视觉精修：design tokens（colors / spacing / radius / typography）+ 5 个基础组件（Card / Button / StatCard / WordCard / RateButton）
- ✅ 多语言界面：中英双语 + Taro.Storage 持久化 + 语言切换器
- ✅ 错因归因报告：`POST /api/ai/analyze-mistake` + 错题模式分类 + AI 针对性建议
- ✅ AI 口语陪练：`POST /api/ai/dialogue/{start,turn,score}` + 5 种场景 + 四维度评分
- ✅ 后台管理系统：apps/admin（Ant Design + ECharts，5 个页面：概览/词书/用户/分析/设置）

## v0.3.0 — 上架准备阶段
- ✅ 用户协议 + 隐私政策（HTML + 小程序展示页 + 我的页面入口）
- ✅ 产品截图规范文档（`docs/SCREENSHOTS-GUIDE.md`）
- ✅ 演示数据生成脚本（让首页/统计页有真实学习数据）
- ✅ ECDICT 真实词库接入（`tools/seed-data/ecdict_to_bundle.py` + `MOCK_WORDS/BUNDLE` 双模式）
- ✅ 小程序扩展：例句填空 + 拼写听写（`pages/practice/index`）
- ✅ apps/mobile Google Play 骨架（React Native + Expo + EAS Build）
- ✅ Google Play 上架指南（`docs/GOOGLE-PLAY-PUBLISH.md`）
- ✅ 小程序上架指南（`docs/MINI-PUBLISH.md`，v0.2 已存在，本次更新）

## v0.2.0 — MVP 可运行骨架
- ✅ ai-gateway：`POST /api/ai/explain` 接口 + DeepSeek 接入 + Prompt 模板版本管理
- ✅ apps/web：MVP 页面（首页 / 选词书 / 复习 / 统计）+ Zustand 状态 + Vite proxy
- ✅ tools/seed-data：ECDICT 导入脚本 + 49 词 GRE 核心 + pgvector schema + SQLite fallback
- ✅ docker-compose：pgvector 镜像 + healthcheck + 依赖顺序
- ✅ docs/GETTING-STARTED.md：端到端启动指南

## v0.1.0 — 初始落地
- PRD、架构、ADR 文档
- Monorepo 骨架（pnpm + Turborepo）
- 全端占位、网络 / 移动 / 小程序 / 桌面 / 双语言后端
- 共享 SDK：types / sdk-fsrs / sdk-fsrs-py / sdk-llm / sdk-llm-py / ui-kit
- 本地 Docker Compose：PostgreSQL + Redis + API Gateway + AI Gateway
