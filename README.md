# AI Design Studio

一个从需求出发、先探索视觉方向，再生成、编辑、检查并交付演示文稿和网页的设计工作台。项目正在分阶段开发；当前功能以本仓库各阶段 PR 中的代码为准。

## 已实现的工作流

1. 填写标题、简报、受众、页数和表达风格。
2. 比较 Editorial（编辑叙事）、Modern（现代极简）、Analytical（数据洞察）三种视觉方向。
3. 编辑故事线和逐页标题/正文。
4. 使用版本化 `DeckDocument 1.0.0` 作为结构化数据格式。
5. 导入/导出 JSON，并在浏览器本地自动保存草稿。
6. 运行确定性质量检查，或在配置 AI 后获取 AI 设计评审建议。
7. 导出 HTML 幻灯片、响应式静态网页，或可继续编辑的 PowerPoint（PPTX）。
8. 配置 OpenAI-compatible Chat Completions 服务后，根据项目简报生成完整页面大纲。
9. 配置可选的 Pexels API Key 后，可按页面搜索在线图片，并将所选图片导入 Deck，同时保留摄影师与来源链接。

## 快速开始

需要 Node.js 18 或更高版本。

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

当前 PPTX/网页渲染支持 `title-body` 布局和三种视觉方向；本地图片上传已支持 PNG/JPEG/WebP，并可填写替代文本与来源/许可说明；自动图片搜索现已支持 Pexels（需自行配置 API Key）；多图库聚合、交互式图表和更丰富的布局仍需继续开发。

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

导出和生成接口接收 JSON 请求体。服务端对 Deck 进行校验；请求体上限为 2 MB。

## 测试

```bash
npm test
```

测试使用 Node.js 内置测试框架，涵盖 Deck Schema、PPTX 输出 smoke test、AI Provider mock、质量检查和 HTML 渲染。CI workflow 位于 `.github/workflows/test.yml`。请以 GitHub Actions 实际运行结果为准；在没有 CI 运行记录前，不应将测试描述为已通过。

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

- 项目/草稿保存在当前浏览器的 localStorage；尚无用户账户或云端持久化。
- AI 生成依赖用户自行配置兼容服务；没有内置 API Key。
- AI 评审提供建议，不是事实核验系统。
- 暂无图片素材搜索、图像版权/归属追踪、图表自动生成、通用网站路由和数据库表单。
- 需要在目标环境运行 `npm test`，并在 PowerPoint/LibreOffice 与主流浏览器中进行最终验收。

## 安全提示

请阅读 [SECURITY.md](SECURITY.md)。不要在公共部署环境直接暴露未鉴权的生成和导出 API；生产环境还需要增加认证、速率限制、审计和部署级请求限制。
