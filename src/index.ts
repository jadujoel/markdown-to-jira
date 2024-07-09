import { convert, html } from './convert'
declare const document: {
  getElementById(id: string): {
    value: string
    innerHTML: string
    innerText: string
    style: { display: string }
    addEventListener(event: string, fn: () => void): void
  }
}
declare const window: {
  convert?: (markdown: string) => string
}
const input = document.getElementById('input')
const output = document.getElementById('output')
const preview = document.getElementById('preview')

input.addEventListener('input', () => {
  output.value = convert(input.value)
  preview.innerHTML = html(input.value)
})
window.convert = convert

