import * as test from "bun:test"
import { convert, verbose } from "./convert.ts"

verbose()

// https://github.com/jadujoel/markdown-to-jira/issues/1
test.it("bold", () => {
  test.expect(convert("__bold__").trim()).toEqual("*bold*")
})

test.it("double underscore", () => {
  test.expect(convert("my__bold__key my__bold__key").trim()).toEqual("my__bold__key my__bold__key")
})

test.it("single and double underscore", () => {
  test.expect(convert("my_bold__key my_bold__key").trim()).toEqual("my_bold__key my_bold__key")
})

test.it("escapes in input", () => {
  test.expect(convert("\_\_bold\_\_").trim()).toEqual("\_\_bold\_\_")
  test.expect(convert("my\_bold\_\_key my\_bold\_\_key").trim()).toEqual("my\_bold\_\_key my\_bold\_\_key")
})

test.it("escapes in output", () => {
  test.expect(convert("my__bold__key my__bold__key").trim()).toEqual("my\_\_bold\_\_key my\_\_bold\_\_key")
  test.expect(convert("some_thing").trim()).toEqual("some\_thing")
})
