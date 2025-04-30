import * as test from "bun:test"
import { convert, verbose } from "./convert.ts"

verbose()

// https://github.com/jadujoel/markdown-to-jira/issues/1
test.it('should render bold correctly', () => {
  test.expect(convert("__bold__").trim()).toEqual("*bold*")
  test.expect(convert("my__bold__key my__bold__key").trim()).toEqual("my__bold__key my__bold__key")
  test.expect(convert("my_bold__key my_bold__key").trim()).toEqual("my_bold__key my_bold__key")
})
