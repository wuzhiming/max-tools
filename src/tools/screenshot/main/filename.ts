const pad = (n: number) => String(n).padStart(2, '0')

const TOKENS = ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss'] as const
type Token = (typeof TOKENS)[number]

function resolveToken(token: Token, d: Date): string {
  switch (token) {
    case 'yyyy': return String(d.getFullYear())
    case 'MM': return pad(d.getMonth() + 1)
    case 'dd': return pad(d.getDate())
    case 'HH': return pad(d.getHours())
    case 'mm': return pad(d.getMinutes())
    case 'ss': return pad(d.getSeconds())
  }
}

export function renderFilenameTemplate(template: string, when: Date = new Date()): string {
  const t = template && template.trim().length > 0
    ? template
    : 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}'
  const replaced = t.replace(/\{(\w+)\}/g, (m, key) => {
    return TOKENS.includes(key as Token) ? resolveToken(key as Token, when) : m
  })
  return replaced.replace(/[\/\\*?"<>|]/g, '-')
}
