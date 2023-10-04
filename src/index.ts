import { convert } from './convert'
declare const document: {
  getElementById(id: string): {
    value: string
    addEventListener(event: string, fn: () => void): void
  }
}
declare const window: {
  convert?: (markdown: string) => string
}
const input = document.getElementById('input')
const output = document.getElementById('output')
input.addEventListener('input', () => output.value = convert(input.value))
window.convert = convert
