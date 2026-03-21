import { convert, html } from './convert'
declare const document: {
  getElementById(id: string): {
    value: string
    innerHTML: string
    innerText: string
    style: { display: string }
    addEventListener(event: string, fn: (e?: any) => void): void
    classList: {
      toggle(name: string, force?: boolean): boolean
      contains(name: string): boolean
      add(name: string): void
      remove(name: string): void
    }
    getAttribute(name: string): string | null
    closest(selector: string): any
    textContent: string
  }
  querySelectorAll(selector: string): Array<{
    addEventListener(event: string, fn: (e?: any) => void): void
    getAttribute(name: string): string | null
    innerHTML: string
  }>
  createElement(tag: string): {
    className: string
    textContent: string
    classList: { add(name: string): void; remove(name: string): void }
    remove(): void
  }
  body: { appendChild(el: any): void }
  addEventListener(event: string, fn: (e?: any) => void): void
}
declare const window: {
  convert?: (markdown: string) => string
  navigator: { clipboard: { writeText(text: string): Promise<void> } }
}
const input = document.getElementById('input')
const output = document.getElementById('output')
const preview = document.getElementById('preview')

input.addEventListener('input', () => {
  output.value = convert(input.value)
  preview.innerHTML = html(input.value)
})
window.convert = convert

const ICON_MAXIMIZE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>'
const ICON_MINIMIZE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>'
const ICON_COPY = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>'
const ICON_CHECK = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'

// ── Fullscreen toggle ──
document.querySelectorAll('.btn-fullscreen').forEach((btn: any) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target')
    if (!targetId) return
    const panel = document.getElementById(targetId)
    const isFullscreen = panel.classList.toggle('fullscreen')
    btn.innerHTML = isFullscreen ? ICON_MINIMIZE : ICON_MAXIMIZE
  })
})

// ── Escape to exit fullscreen ──
document.addEventListener('keydown', (e: any) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.panel').forEach((panel: any) => {
      panel.classList.remove('fullscreen')
    })
    document.querySelectorAll('.btn-fullscreen').forEach((btn: any) => {
      btn.innerHTML = ICON_MAXIMIZE
    })
  }
})

// ── Copy to clipboard ──
function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  document.body.appendChild(toast)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'))
  })
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 1500)
}

declare function requestAnimationFrame(fn: () => void): void
declare function setTimeout(fn: () => void, ms: number): void

const sources: Record<string, { value?: string; innerText?: string }> = {
  input, output, preview
}

document.querySelectorAll('.btn-copy').forEach((btn: any) => {
  btn.addEventListener('click', () => {
    const sourceId = btn.getAttribute('data-source')
    if (!sourceId) return
    const el = sources[sourceId]
    if (!el) return
    const text = el.value ?? el.innerText ?? ''
    window.navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = ICON_CHECK
      showToast('Copied to clipboard')
      setTimeout(() => { btn.innerHTML = ICON_COPY }, 1500)
    })
  })
})
