
// ─── utils.js ────────────────────────────────────────────────────────────────
// 解析命令行参数（无需第三方库）

export function parseArgs() {
  const raw = process.argv.slice(2);
  const get = key => {
    const i = raw.indexOf(key);
    return i !== -1 ? raw[i + 1] : undefined;
  };
  return {
    refProject:   get('--ref-project')   || get('-rp'),
    refMr:        Number(get('--ref-mr') || get('-rm')),
    targetProject:get('--target-project')|| get('-tp'),
    skillOutput:  get('--skill-output')  || './skills/latest.json',
    skillInput:   get('--skill-input'),   // 跳过分析，直接复用已有 skill
    ref:          get('--ref')           || 'main',
    createMr:    !raw.includes('--no-mr'),
  };
}