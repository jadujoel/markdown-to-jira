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

const inputButton = document.getElementById('show_input')
const outputButton = document.getElementById('show_output')
const previewButton = document.getElementById('show_preview')

const state = {
  input: true,
  output: true,
  preview: true,
}
// inputButton.addEventListener('click', () => {
//   state.input = !state.input
//   inputButton.innerText = state.input ? 'Hide Input' : 'Show Input'
//   input.style.display = state.input ? 'block' : 'none'
// })

// outputButton.addEventListener('click', () => {
//   state.output = !state.output
//   outputButton.innerText = state.output ? 'Hide Output' : 'Show Output'
//   output.style.display = state.output ? 'block' : 'none'
// })

// previewButton.addEventListener('click', () => {
//   state.preview = !state.preview
//   previewButton.innerText = state.preview ? 'Hide Preview' : 'Show Preview'
//   preview.style.display = state.preview ? 'block' : 'none'
// })
