import { Renderer, marked, type Tokens } from 'marked'
import hljs from 'highlight.js';

let dbg = (...args: unknown[]) => {}
export function verbose() {
  dbg = console.log
}

export const MAX_CODE_LINE = 20 as const
export const LANGS = {
  shell: 'bash',
  bash: 'bash',
  zsh: 'bash',
  actionscript3: 'actionscript3',
  csharp: 'csharp',
  coldfusion: 'coldfusion',
  cpp: 'cpp',
  css: 'css',
  delphi: 'delphi',
  diff: 'diff',
  erlang: 'erlang',
  groovy: 'groovy',
  java: 'java',
  javafx: 'javafx',
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  perl: 'perl',
  php: 'php',
  none: 'none',
  powershell: 'powershell',
  python: 'python',
  ruby: 'ruby',
  scala: 'scala',
  rust: 'rust',
  sql: 'sql',
  vb: 'vb',
  'html/xml': 'html/xml'
} as const


export class JiraRenderer extends Renderer {
  paragraph ({ tokens, raw, text }: Tokens.Paragraph): string {
    dbg(`Paragraph: ${tokens}`, tokens)
    return text + '\n\n'
  }
  html ({ text }: Tokens.HTML): string {
    dbg(`HTML: ${text}`)
    return text
  }
  heading ({ text, depth }: Tokens.Heading): string {
    dbg(`Heading: ${text}`)
    return `h${depth}. ${text}\n\n`
  }
  strong ({ text }: Tokens.Strong): string {
    dbg(`Strong: ${text}`)
    return `*${text}*`
  }
  em ({ text }: Tokens.Em): string {
    dbg(`Em: ${text}`)
    return `_${text}_`
  }
  del ({ text }: Tokens.Del): string {
    dbg(`Del: ${text}`)
    return `-${text}-`
  }
  codespan ({ text }: Tokens.Codespan): string {
    dbg(`Codespan: ${text}`)
    return `{{${text}}}`
  }
  blockquote ({ text }: Tokens.Blockquote): string {
    dbg(`Blockquote: ${text}`)
    return `{quote}${text}{quote}`
  }
  br (): string {
    return '\n'
  }
  hr (): string {
    return '----\n\n'
  }
  link ({ href, text }: Tokens.Link): string {
    return `[${text != null ? `${text}|${href}` : href}]`
  }
  list ({ raw, ordered }: Tokens.List): string {
    const type = ordered ? '#' : '*'
    const result = `${
      raw.trim()
      .split('\n')
      .filter(v => v)
      .map(line => `\n${type} ${line}`)
      .join('')
      .replaceAll("* *", "**")
    }\n\n`
    return result
  }
  listitem ({ text }: Tokens.ListItem): string {
    return `${text}\n`
  }
  image ({ href }: Tokens.Image): string {
    return `!${href}!`
  }
  table ({ header, raw }: Tokens.Table) {
    return header + raw + '\n'
  }
  tablerow ({ text }: Tokens.TableRow): string {
    return text + '\n'
  }
  tablecell ({ header, text }: Tokens.TableCell): string {
    const type = header ? '||' : '|'
    return type + text
  }
  code ({ text, lang }: Tokens.Code): string {
    return `{code:language=${(LANGS as any)[lang ?? ""] ?? ''}|borderStyle=solid|theme=RDark|linenumbers=true|collapse=${text.split('\n').length > MAX_CODE_LINE}}\n${text}\n{code}\n\n`
  }
  text({ text }: Tokens.Text): string {
    dbg(`Text: ${text}`)
    return text
  }
  checkbox({ checked }: Tokens.Checkbox): string {
    return checked ? '[x]' : '[-]'
  }
}

export function convert(markdown: string): string {
  const result = <string> marked(markdown, { renderer: new JiraRenderer(), async: false })
  return fixCommentedCodeBlocks(result)
}

export function fixCommentedCodeBlocks(markdown: string): string {
  let inCodeBlock = false; // keep track if we are inside a code block
  // split by lines and map through them to apply transformation
  return markdown.split('\n').map(line => {
    // check if this line is the start or end of a code block
    if (line.includes('{code')) {
      inCodeBlock = true;
      return line.split('# ').join('');
    } else if (line.includes('{code}')) {
      inCodeBlock = false;
      return line.split('# ').join('');
    }
    // if inside a code block and the line starts with a '#', remove the '#'
    if (inCodeBlock && line.startsWith('#')) {
      return line.slice(1);
    } else {
      return line;
    }
  }).join('\n'); // join back to get the transformed string
}

function validLanguage(language?: string): string {
  if (language === undefined) {
    return "plaintext"
  }
  if (hljs.getLanguage(language) === undefined) {
    return "plaintext"
  }
  return language
}

class HTMLRenderer extends Renderer {
  code({ text, lang, escaped }: Tokens.Code): string {
    const language = validLanguage(lang)
    return `<pre><code class="hljs ${language}">${hljs.highlight(text, { language }).value}</code></pre>`;
  }
}

export function html (markdown: string): string {
  return marked(markdown, {
    renderer: new HTMLRenderer(),
    pedantic: false,
    gfm: true,
    breaks: false,
    async: false,
  });
}
