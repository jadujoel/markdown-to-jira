import * as test from "bun:test"
import { convert, verbose } from "./convert.ts"

verbose()

// https://github.com/jadujoel/markdown-to-jira/issues/1
test.it('should render bold correctly', () => {
  test.expect(convert("__bold__").trim()).toEqual("*bold*")
  test.expect(convert("\_\_bold\_\_").trim()).toEqual("\_\_bold\_\_")
  test.expect(convert("my__bold__key my__bold__key").trim()).toEqual("my\_\_bold\_\_key my\_\_bold\_\_key")
  test.expect(convert("my\_bold\_\_key my\_bold\_\_key").trim()).toEqual("my\_bold\_\_key my\_bold\_\_key")
  test.expect(convert("some_thing").trim()).toEqual("some\_thing")
})
