# AI Design Studio

一个从需求出发、先探索视觉方向，再生成、编辑、检查并交付演示文稿和网页的设计工作台。项目正在分阶段开发；当前功能以本仓库各阶段 PR 中的代码为准。

## 已实现的工作流

1. 填写标题、简报、受众、页数和表达风格。
2. 比较 Editorial（编辑叙事）、Modern（现代极简）、Analytical（数据洞察）三种视觉方向。
3. 编辑故事线和逐页标题/正文，并为每页选择标准内容、章节分隔、关键指标或柱状/折线图布局。
4. 使用版本化 `DeckDocument 1.0.0` 作为结构化数据格式。
5. 导入/导出 JSON，并在浏览器本地自动保存草稿。
6. 在同一浏览器中创建、切换、复制、重命名和删除多个项目；旧版单草稿会在首次启动时迁移。
7. 运行确定性质量检查，或在配置 AI 后获取 AI 设计评审建议。
8. 导出 HTML 幻灯片、响应式静态网页，或可继续编辑的 PowerPoint（PPTX）。
9. 配置 OpenAI-compatible Chat Completions 服务后，根据项目简报生成完整页面大纲，并可选择章节分隔、指标和图表布局；数字布局必须能在简报中找到对应数字。
10. 配置可选的 Pexels API Key 后，可按页面搜索在线图片，并将所选图片导入 Deck，同时保留摄影师与来源链接。

## 快速开始

需要 Node.js 20 或更高版本（推荐使用仍受支持的 LTS 版本）。

```bash
npm install
npm test
npm start
```

打开 `http://localhost:3000`。

### 启用 AI 生成功能

AI 能力默认不启用。需要先配置一个兼容 OpenAI Chat Completions API 的服务。

Linux/macOS：

```bash
export AI_BASE_URL="https://api.openai.com/v1"
export AI_API_KEY="your-secret-key"
export AI_MODEL="gpt-4o-mini"
npm start
```

Windows PowerShell：

```powershell
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_API_KEY = "your-secret-key"
$env:AI_MODEL = "gpt-4o-mini"
npm start
```

如果使用本地部署的 OpenAI-compatible 模型，将 `AI_BASE_URL` 指向本地服务的 API 根地址，并设置该服务支持的模型名称。服务需要支持 `POST /chat/completions` 和 JSON object 输出模式。兼容实现存在差异，若服务不支持 `response_format: { type: "json_object" }`，需要为该服务增加适配。

### 启用在线图片搜索（可选）

1. 在 Pexels 开发者账户申请 API Key。
2. 在服务端环境设置 `PEXELS_API_KEY`，然后重启服务；不要将 Key 放进浏览器代码或提交到 Git。
3. 在任一页面的“搜索在线图片（Pexels）”输入关键词，选择结果后导入图片。

搜索和导入由服务端代理完成。只允许导入 Pexels 图片 CDN 上的 HTTPS 图片，限制为 JPEG/PNG/WebP 且单张不超过 500 KB。导入时会保存替代文本、摄影师署名和 Pexels 来源页；使用者仍需遵守素材许可并自行确认具体用途是否合规。没有配置 Key 时，现有手动上传功能仍可使用。

**不要将真实 API Key 写入前端、提交到 Git、放进公开的 `.env.example` 或浏览器 localStorage。** 部署时请使用平台 Secret/Environment 配置。

## 导出说明

- **导出演示 HTML**：生成可打印的多页 HTML 幻灯片。
- **导出网页**：将同一份 Deck 内容生成自包含、响应式的单页网站。
- **导出 PPTX**：生成包含可编辑文本框和矢量图形的 PowerPoint，不是幻灯片截图。
- **导出/导入 JSON**：用于备份、迁移或作为后续生成流程的结构化输入。

当前 PPTX/网页渲染支持 `title-body`、`section-divider`、`metric-highlight` 和 `chart` 四种页面布局，以及三种视觉方向；图表支持 2–8 个数据点的柱状图与折线图，PPTX 使用可编辑原生图表，网页使用内嵌 SVG。本地图片上传已支持 PNG/JPEG/WebP，并可填写替代文本与来源/许可说明；自动图片搜索现已支持 Pexels（需自行配置 API Key）；多图库聚合、复杂多序列图表和更丰富的布局仍需继续开发。

## HTTP API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 服务健康状态 |
| POST | `/api/generate/deck` | 根据简报生成结构化 Deck（需配置 AI） |
| POST | `/api/review/deck` | AI 设计评审（需配置 AI） |
| POST | `/api/regenerate/slide` | 按修改要求重写单页（需配置 AI） |
| GET | `/api/assets/search?q=...` | 搜索 Pexels 图片（需配置 `PEXELS_API_KEY`） |
| POST | `/api/assets/import` | 下载并导入受限格式的 Pexels 图片 |
| POST | `/api/quality/check` | 确定性质量检查 |
| POST | `/api/export/pptx` | 导出可编辑 PowerPoint |
| POST | `/api/export/site` | 导出响应式静态网站 |

导出和生成接口接收 JSON 请求体。服务端对 Deck 进行校验；默认请求体上限为 10 MB，可通过 `MAX_BODY_BYTES` 环境变量调整（单位：字节）。超限请求会被完整读取并返回 HTTP 413，避免服务端主动中断连接。

## 测试

```bash
npm test
```

测试使用 Node.js 内置测试框架，涵盖 Deck Schema、PPTX 图表 smoke test、AI Provider mock、HTTP API 集成与限流、Pexels 素材适配器、速率限制器、工作台脚本语法和项目管理控件检查、质量检查（含重复内容、布局匹配、图表数据和图片元信息规则）和 HTML 渲染。CI workflow 位于 `.github/workflows/test.yml`。请以 GitHub Actions 实际运行结果为准；在没有 CI 运行记录前，不应将测试描述为已通过。

## API 速率限制

服务端按客户端 IP 使用内存固定窗口限流，默认每分钟普通 API 60 次、AI 生成/评审/改写 10 次。可设置 `RATE_LIMIT_WINDOW_MS`（默认 60000 毫秒）、`API_RATE_LIMIT_MAX`（默认 60）和 `AI_RATE_LIMIT_MAX`（默认 10）。超限返回 HTTP 429 和 `Retry-After`。该限流状态只存在于单个 Node 进程中，重启会清空；多实例部署应在反向代理或 API 网关实现共享限流，并配置认证。

## 项目结构

```text
.
├── index.html
├── server.js
├── packages/
│   ├── ai-provider/       # 服务端 OpenAI-compatible 适配器
│   ├── deck-schema/       # Deck 数据格式与校验
│   ├── design-workflow/   # 质量检查
│   ├── render-html/       # 静态网页渲染器
│   └── render-pptx/       # 可编辑 PPTX 渲染器
├── tests/
├── docs/
└── .github/workflows/
```

## 设计原则与上游参考

工作流借鉴了 [huashu-design](https://github.com/alchaincyf/huashu-design) 的一些理念：先理解上下文、比较不同设计方向、让内容驱动布局，并在交付前进行质量检查。本项目当前以独立实现为主；若后续复制或引入上游源码/大段文本，应遵守其 MIT 许可证和署名要求。

## 当前限制

- 多项目保存在当前浏览器的 localStorage，不会在设备或浏览器之间同步；清除网站数据前请导出 JSON 备份。包含大量嵌入图片时可能触及浏览器存储配额。尚无用户账户或云端持久化。
- AI 生成依赖用户自行配置兼容服务；没有内置 API Key。
- AI 评审提供建议，不是事实核验系统。
- 图片搜索目前仅支持可选的 Pexels 服务；应用会保留摄影师和来源链接，但不会自动判定授权是否合法。多图库聚合、图表自动生成、通用网站路由和数据库表单仍未实现。
- 需要在目标环境运行 `npm test`，并在 PowerPoint/LibreOffice 与主流浏览器中进行最终验收。

## 依赖安全

CI 会执行 `npm audit` 并在发现 High/Critical 级别漏洞时失败。当前通过 npm override 将 `pptxgenjs` 的 `image-size` 1.x 依赖替换为兼容的 `image-size-next@1.2.2`，以缓解其高危无限循环/拒绝服务问题；该替代包是社区维护的兼容分支，并非原项目官方发布。升级相关依赖时，应继续检查 PowerPoint 图片渲染和完整测试结果。

## 安全提示

请阅读 [SECURITY.md](SECURITY.md)。不要在公共部署环境直接暴露未鉴权的生成和导出 API。当前内存限流是基础保护，生产环境仍需认证、共享限流、审计和部署级请求限制。
