import { Renderer, marked } from 'marked'
import hljs from 'highlight.js';

let dbg = (...args: unknown[]) => {}
export function verbose() {
  dbg = console.log
}

export const MAX_CODE_LINE = 20 as const
export const langMap = {
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
  paragraph (text: string): string {
    dbg(`Paragraph: ${text}`)
    return text + '\n\n'
  }
  html (input: string): string {
    dbg(`HTML: ${input}`)
    return input
  }
  heading (text: string, level: number): string {
    dbg(`Heading: ${text}`)
    return `h${level}. ${text}\n\n`
  }
  strong (text: string): string {
    dbg(`Strong: ${text}`)
    return `*${text}*`
  }
  em (text: string): string {
    dbg(`Em: ${text}`)
    return `_${text}_`
  }
  del (text: string): string {
    dbg(`Del: ${text}`)
    return `-${text}-`
  }
  codespan (text: string): string {
    dbg(`Codespan: ${text}`)
    return `{{${text}}}`
  }
  blockquote (quote: string): string {
    dbg(`Blockquote: ${quote}`)
    return `{quote}${quote}{quote}`
  }
  br (): string {
    return '\n'
  }
  hr (): string {
    return '----\n\n'
  }
  link (href: string, _title: string, text?: string): string {
    return `[${text != null ? `${text}|${href}` : href}]`
  }
  list (body: string, ordered: boolean): string {
    const type = ordered ? '#' : '*'
    const result = `${
      body.trim()
      .split('\n')
      .filter(v => v)
      .map(line => `\n${type} ${line}`)
      .join('')
      .replaceAll("* *", "**")
    }\n\n`
    return result
  }
  listitem (body: string): string {
    return `${body}\n`
  }
  image (href: string): string {
    return `!${href}!`
  }
  table (header: string, body: string) {
    return header + body + '\n'
  }
  tablerow (content: string): string {
    return content + '\n'
  }
  tablecell (content: string, flags: { readonly header: boolean; readonly align: "center" | "left" | "right" | null }): string {
    const type = flags.header ? '||' : '|'
    return type + content
  }
  code (code: string, lang: keyof typeof langMap): string {
    return `{code:language=${langMap[lang] ?? ''}|borderStyle=solid|theme=RDark|linenumbers=true|collapse=${code.split('\n').length > MAX_CODE_LINE}}\n${code}\n{code}\n\n`
  }
  text(text: string): string {
    dbg(`Text: ${text}`)
    return text
  }
  checkbox(checked: boolean): string {
    return checked ? '[x]' : '[-]'
  }
}

export function convert(markdown: string): string {
  return fixCommentedCodeBlocks(marked(markdown, { renderer: new JiraRenderer() }))
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


class HTMLRenderer extends Renderer {
  code(code: string, language: string) {
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    return `<pre><code class="hljs ${language}">${hljs.highlight(code, { language: validLanguage }).value}</code></pre>`;
  }
}

export function html (markdown: string): string {
  return marked(markdown, {
    renderer: new HTMLRenderer(),
    pedantic: false,
    gfm: true,
    breaks: false,
  });
}
