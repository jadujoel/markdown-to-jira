import * as test from "bun:test"
import { convert, verbose } from "./convert.ts"

verbose()

// https://github.com/jadujoel/markdown-to-jira/issues/1
test.it('should render _ correctly', () => {
  test.expect(convert("__bold__").trim()).toEqual("*bold*")
  test.expect(convert(String.raw`\_\_bold\_\_`).trim()).toEqual(String.raw`\_\_bold\_\_`)
  test.expect(convert("my__key my__key").trim()).toEqual(String.raw`my\_\_key my\_\_key`)
  test.expect(convert("`my__key my__key`").trim()).toEqual(String.raw`{{my\_\_key my\_\_key}}`)
  test.expect(convert("```\nmy__key my__key\n```").trim()).toEqual("{code:language=|borderStyle=solid|theme=RDark|linenumbers=true|collapse=false}\nmy__key my__key\n{code}")
})
