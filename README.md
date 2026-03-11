# Migration Skill Generator

从 GitLab MR 的 diff 自动生成代码迁移 Skill，用于指导 AI Agent 在结构相似的工程中执行相同的代码迁移。

## 功能

- **自动 Diff 解析**：从 GitLab MR 拉取参考 diff
- **Skill 生成**：将 diff 转换为结构化的 Agent Skill（`.prompt.md` 格式）
- **迁移指导**：生成的 Skill 包含迁移原则和步骤，指导 Agent 理解意图而非机械照搬

## 设置

### 1. 配置环境变量

复制 `.env` 文件并填写真实值：

```bash
cp .env.example .env
```

编辑 `.env`，设置 GitLab URL 和 Personal Access Token：

```
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=glpat-xxxxx  # API scope
```

### 2. 安装依赖

```bash
npm install
```

## 使用

### 基础用法

从 GitLab MR 生成迁移 Skill：

```bash
node index.js \
  --ref-project "project/path" \
  --ref-mr 42 \
  --skill-output ./skills/my-migration
```

### 参数说明

- `--ref-project`：参考工程在 GitLab 中的路径（如 `web/permission` 或 `group/project`）
- `--ref-mr`：参考 MR 的 ID 号
- `--skill-output`：输出 Skill 文件的路径（可省略后缀 `.prompt.md`，会自动添加）

### 实际示例

以下是一个完整的迁移示例——从 `web/permission` 项目的 MR #27 生成微应用 → 插件化迁移的 Skill：

```bash
node index.js \
  --ref-project "web/permission" \
  --ref-mr 27 \
  --skill-output ./skills/microapp-migration-to-plugin-local-server-support
```

执行后会在 `./skills/` 目录生成 `microapp-migration-to-plugin-local-server-support.prompt.md` 文件。

## 输出

输出的 `.prompt.md` 文件是标准的 VS Code Copilot Agent Skill，包含：

- YAML frontmatter：标记为 `mode: agent`
- **迁移原则**：说明如何正确理解和应用改动
- **迁移步骤**：分步骤指导 Agent 完成迁移
- **参考 Diff**：镶入完整的 unified diff，作为迁移依据

Agent 可直接加载此 Skill，在其他工程中自动执行相似的代码迁移。

## 项目结构

```
.
├── index.js              # 主流程入口
├── gitlab.js             # GitLab API 封装
├── diffParser.js         # Diff 解析器
├── skillBuilder.js       # Skill 生成器
├── utils.js              # 工具函数
├── .env                  # 环境变量（需填充真实值）
├── package.json
└── skills/               # 输出 Skill 文件目录
```

## 文件说明

- **gitlab.js**：GitLab REST API 调用，支持分页拉取大型 MR 的 diffs（每页 20 个文件，避免服务端超时）
- **diffParser.js**：将 API 返回的 diffs 转换为便于分析的文本格式
- **skillBuilder.js**：生成结构化的 Skill 文档（Markdown + YAML frontmatter）
- **utils.js**：命令行参数解析

## 常见问题

### Q: 为什么 GitLab API 返回 500 错误？

**A**: 这通常是因为请求的 diffs 数据量过大。本工具已配置为每页 20 个文件分页拉取，能有效避免服务端超时。

### Q: 能否跳过某些文件（如 lock 文件）？

**A**: 可以。目前已配置自动过滤 `pnpm-lock.yaml`。如需跳过其他文件，编辑 `gitlab.js` 的 `fetchMRDiffs` 函数中的 `filter` 逻辑。

### Q: 输出的 Skill 文件在哪里使用？

**A**: 将 `.prompt.md` 文件放在目标工程的 `.copilot/skills/` 目录或根目录，Copilot Agent 会自动加载并执行迁移任务。

## License

MIT
