/**
 * skillBuilder.js
 * 调用 Claude API，从 diff 中提取迁移规则，
 * 输出结构化 Skill JSON，可保存复用。
 */

import fs                        from 'fs/promises';
import { diffToPromptText }      from './diffParser.js';

/**
 * Skill 结构：
 * {
 *   version: 1,
 *   summary: "简短描述",
 *   rules: [
 *     {
 *       id: "rule-001",
 *       description: "将 foo() 替换为 bar()",
 *       type: "replace" | "add-import" | "remove-import" | "refactor" | "config",
 *       match: {
 *         pattern: "foo\\(([^)]+)\\)",   // 正则，用于定位需要改动的代码
 *         fileGlob: "**\/*.js",           // 作用范围
 *         context: "描述上下文",
 *       },
 *       transform: {
 *         before: "foo($1)",              // 变更前示例
 *         after:  "bar($1)",              // 变更后示例
 *         note:   "补充说明",
 *       }
 *     }
 *   ]
 * }
 */

export async function buildSkill(parsedDiffs, outputPath) {
  const diffText = diffToPromptText(parsedDiffs);

  const systemPrompt = `你是一个代码迁移专家。
用户会给你一段 unified diff，代表某次代码迁移的参考改动。
你需要从 diff 中提取出可复用的迁移规则，以便自动应用到其他项目。

输出要求：
1. 只输出 JSON，不要任何额外说明或 markdown 代码块。
2. 严格遵守下面的 schema：
{
  "version": 1,
  "summary": "一句话总结本次迁移的核心内容",
  "rules": [
    {
      "id": "rule-001",
      "description": "规则的人类可读说明",
      "type": "replace | add-import | remove-import | refactor | config",
      "match": {
        "pattern": "用于匹配需要改动的代码的正则表达式字符串（JS 语法）",
        "fileGlob": "适用的文件通配符，如 **/*.js",
        "context": "描述在什么情况下触发此规则"
      },
      "transform": {
        "before": "变更前的代码示例片段",
        "after":  "变更后的代码示例片段",
        "note":   "补充说明（可选）"
      }
    }
  ]
}
3. 规则要尽量原子化，一条规则只描述一个变更点。
4. pattern 要足够通用，能匹配同类代码，而不是只匹配 diff 中的那一行。`;

  const userPrompt = `以下是参考迁移的 diff：\n\n${diffText}`;

  const content = `${systemPrompt}\n\n${userPrompt}`;

  if (outputPath) {
    await fs.writeFile(outputPath, content, 'utf-8');
  }
  return content;
}

/** 从文件加载已有 skill，复用时使用 */
export async function loadSkill(skillPath) {
  const raw = await fs.readFile(skillPath, 'utf-8');
  return JSON.parse(raw);
}