import { convert } from './convert'

declare const document: {
  getElementById(id: string): {
    value: string
    addEventListener(event: string, fn: () => void): void
  }
}

const input = document.getElementById('input')
const output = document.getElementById('output')

const runner = pipe(
  convert,
  // raw('----', ''),
  fixCommentedCodeBlocks,
  write
)
const run = () => runner(read())

input.addEventListener('input', run)

function read(): string {
  return input.value
}

function write(str: string): string {
  output.value = str
  return str
}

function pipe(...fns: readonly ((arg: string) => string)[]): (arg: string) => string {
  return fns.reduce((f, g) => (...args) => g(f(...args)));
}

function raw(search: string, replacement: string): (str: string) => string {
  return (str) => str.split(search).join(replacement);
}

function fixCommentedCodeBlocks(markdown: string): string {
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
