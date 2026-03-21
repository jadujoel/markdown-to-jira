import { describe, expect, it } from "bun:test";
import { Parser } from "marked";
import {
	convert,
	fixCommentedCodeBlocks,
	fixDoubleUnderscore,
	html,
	JiraRenderer,
	verbose,
} from "./convert.ts";

/** Helper: convert and trim trailing whitespace */
const c = (md: string) => convert(md).trim();

// ─── Basic Inline Formatting ────────────────────────────────────────

describe("bold", () => {
	it("**stars**", () => {
		expect(c("**bold**")).toEqual("*bold*");
	});
	it("__underscores__", () => {
		expect(c("__bold__")).toEqual("*bold*");
	});
	it("mid-word double underscore is escaped", () => {
		expect(c("my__bold__key my__bold__key")).toEqual(
			"my\\_\\_bold\\_\\_key my\\_\\_bold\\_\\_key",
		);
	});
});

describe("italic", () => {
	it("*stars*", () => {
		expect(c("*italic*")).toEqual("_italic_");
	});
	it("_underscores_", () => {
		expect(c("_italic_")).toEqual("_italic_");
	});
	it("mid-word single underscore stays literal", () => {
		expect(c("some_thing")).toEqual("some_thing");
	});
});

describe("strikethrough", () => {
	it("~~text~~", () => {
		expect(c("~~deleted~~")).toEqual("-deleted-");
	});
});

describe("inline code", () => {
	it("`code`", () => {
		expect(c("`some code`")).toEqual("{{some code}}");
	});
	it("``code with backtick``", () => {
		expect(c("``code``")).toEqual("{{code}}");
	});
});

describe("bold italic", () => {
	it("***text***", () => {
		expect(c("***bold italic***")).toEqual("_*bold italic*_");
	});
});

// ─── Headings ───────────────────────────────────────────────────────

describe("headings", () => {
	it("h1", () => expect(c("# H1")).toEqual("h1. H1"));
	it("h2", () => expect(c("## H2")).toEqual("h2. H2"));
	it("h3", () => expect(c("### H3")).toEqual("h3. H3"));
	it("h4", () => expect(c("#### H4")).toEqual("h4. H4"));
	it("h5", () => expect(c("##### H5")).toEqual("h5. H5"));
	it("h6", () => expect(c("###### H6")).toEqual("h6. H6"));
	it("heading with bold", () => {
		expect(c("## **Bold** heading")).toEqual("h2. *Bold* heading");
	});
	it("heading with inline code", () => {
		expect(c("## `code` heading")).toEqual("h2. {{code}} heading");
	});
});

// ─── Links ──────────────────────────────────────────────────────────

describe("links", () => {
	it("basic link", () => {
		expect(c("[text](http://example.com)")).toEqual(
			"[text|http://example.com]",
		);
	});
	it("link with title (title ignored)", () => {
		expect(c('[text](http://example.com "title")')).toEqual(
			"[text|http://example.com]",
		);
	});
});

// ─── Images ─────────────────────────────────────────────────────────

describe("images", () => {
	it("basic image", () => {
		expect(c("![alt](http://img.png)")).toEqual("!http://img.png!");
	});
});

// ─── Horizontal Rule ────────────────────────────────────────────────

describe("horizontal rule", () => {
	it("---", () => expect(c("---")).toEqual("----"));
	it("***", () => expect(c("***")).toEqual("----"));
	it("___", () => expect(c("___")).toEqual("----"));
});

// ─── Blockquote ─────────────────────────────────────────────────────

describe("blockquote", () => {
	it("simple quote", () => {
		expect(c("> quote text")).toEqual("{quote}quote text\n\n{quote}");
	});
	it("quote with bold", () => {
		expect(c("> **bold** in quote")).toEqual(
			"{quote}*bold* in quote\n\n{quote}",
		);
	});
});

// ─── Code Blocks ────────────────────────────────────────────────────

describe("code blocks", () => {
	it("fenced with language", () => {
		const result = c("```js\nconsole.log(1)\n```");
		expect(result).toContain("{code:language=javascript");
		expect(result).toContain("console.log(1)");
		expect(result).toContain("{code}");
	});
	it("fenced without language", () => {
		const result = c("```\nhello\n```");
		expect(result).toContain("{code:language=");
		expect(result).toContain("hello");
	});
	it("typescript language mapping", () => {
		const result = c("```ts\nconst x = 1\n```");
		expect(result).toContain("{code:language=typescript");
	});
	it("bash language mapping", () => {
		const result = c("```bash\necho hi\n```");
		expect(result).toContain("{code:language=bash");
	});
	it("shell maps to bash", () => {
		const result = c("```shell\nls -la\n```");
		expect(result).toContain("{code:language=bash");
	});
	it("collapse for long code blocks", () => {
		const lines = Array.from({ length: 25 }, (_, i) => `line ${i}`).join("\n");
		const result = c("```\n" + lines + "\n```");
		expect(result).toContain("collapse=true");
	});
	it("no collapse for short code blocks", () => {
		const result = c("```\nshort\n```");
		expect(result).toContain("collapse=false");
	});
});

// ─── Lists ──────────────────────────────────────────────────────────

describe("unordered lists", () => {
	it("basic", () => {
		expect(c("- a\n- b\n- c")).toEqual("* a\n* b\n* c");
	});
	it("with asterisk markers", () => {
		expect(c("* a\n* b")).toEqual("* a\n* b");
	});
	it("nested", () => {
		expect(c("- a\n  - b\n  - c\n- d")).toEqual("* a\n** b\n** c\n* d");
	});
	it("3-level nested", () => {
		expect(c("- a\n  - b\n    - c\n  - d\n- e")).toEqual(
			"* a\n** b\n*** c\n** d\n* e",
		);
	});
	it("with bold item", () => {
		expect(c("- **bold item**\n- normal")).toEqual("* *bold item*\n* normal");
	});
	it("with link", () => {
		expect(c("- [link](http://a.com)\n- text")).toEqual(
			"* [link|http://a.com]\n* text",
		);
	});
	it("with inline code", () => {
		expect(c("- `code` item\n- normal")).toEqual("* {{code}} item\n* normal");
	});
});

describe("ordered lists", () => {
	it("basic", () => {
		expect(c("1. a\n2. b\n3. c")).toEqual("# a\n# b\n# c");
	});
	it("nested", () => {
		expect(c("1. a\n   1. b\n   2. c\n2. d")).toEqual("# a\n## b\n## c\n# d");
	});
});

describe("mixed list types", () => {
	it("ordered with unordered children", () => {
		expect(c("1. a\n   - b\n   - c\n2. d")).toEqual("# a\n#* b\n#* c\n# d");
	});
});

describe("checkboxes", () => {
	it("checked and unchecked", () => {
		expect(c("- [x] done\n- [ ] todo")).toEqual("* [x] done\n* [-] todo");
	});
});

// ─── Tables ─────────────────────────────────────────────────────────

describe("tables", () => {
	it("basic table", () => {
		const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
		expect(c(md)).toEqual("||A||B||\n|1|2|");
	});
	it("table with formatting", () => {
		const md = "| **Header** | _Other_ |\n| --- | --- |\n| cell | cell |";
		expect(c(md)).toEqual("||*Header*||_Other_||\n|cell|cell|");
	});
});

// ─── Line Breaks ────────────────────────────────────────────────────

describe("line breaks", () => {
	it("two trailing spaces", () => {
		expect(c("line1  \nline2")).toEqual("line1\nline2");
	});
});

// ─── Paragraphs ─────────────────────────────────────────────────────

describe("paragraphs", () => {
	it("two paragraphs", () => {
		expect(c("para1\n\npara2")).toEqual("para1\n\npara2");
	});
	it("three paragraphs", () => {
		expect(c("first\n\nsecond\n\nthird")).toEqual("first\n\nsecond\n\nthird");
	});
});

// ─── Complex Combinations ───────────────────────────────────────────

describe("nested inline formatting", () => {
	it("bold wrapping italic", () => {
		expect(c("**bold and *italic* text**")).toEqual("*bold and _italic_ text*");
	});
	it("italic wrapping bold", () => {
		expect(c("*italic and **bold** text*")).toEqual("_italic and *bold* text_");
	});
	it("bold wrapping inline code", () => {
		expect(c("**bold with `code`**")).toEqual("*bold with {{code}}*");
	});
	it("strikethrough wrapping bold", () => {
		expect(c("~~strike with **bold**~~")).toEqual("-strike with *bold*-");
	});
	it("link with bold text", () => {
		expect(c("[**bold link**](http://example.com)")).toEqual(
			"[*bold link*|http://example.com]",
		);
	});
	it("link with inline code", () => {
		expect(c("[`code`](http://example.com)")).toEqual(
			"[{{code}}|http://example.com]",
		);
	});
});

describe("complex documents", () => {
	it("heading + paragraph + list", () => {
		const md = "# Title\n\nSome text here.\n\n- item 1\n- item 2";
		const expected = "h1. Title\n\nSome text here.\n\n* item 1\n* item 2";
		expect(c(md)).toEqual(expected);
	});

	it("heading + code block + paragraph", () => {
		const md = "## Setup\n\n```bash\nnpm install\n```\n\nThen run it.";
		const result = c(md);
		expect(result).toContain("h2. Setup");
		expect(result).toContain("{code:language=bash");
		expect(result).toContain("npm install");
		expect(result).toContain("Then run it.");
	});

	it("paragraph with multiple inline formats", () => {
		expect(c("This is **bold**, *italic*, ~~deleted~~, and `code`.")).toEqual(
			"This is *bold*, _italic_, -deleted-, and {{code}}.",
		);
	});

	it("blockquote with multiple formats", () => {
		const result = c("> **bold** and *italic* in a quote");
		expect(result).toContain("{quote}");
		expect(result).toContain("*bold*");
		expect(result).toContain("_italic_");
	});

	it("nested list with formatting", () => {
		const md =
			"- **bold item**\n  - *italic child*\n  - `code child`\n- normal";
		expect(c(md)).toEqual(
			"* *bold item*\n** _italic child_\n** {{code child}}\n* normal",
		);
	});

	it("table followed by paragraph", () => {
		const md = "| A | B |\n| --- | --- |\n| 1 | 2 |\n\nAfter table.";
		const result = c(md);
		expect(result).toContain("||A||B||");
		expect(result).toContain("|1|2|");
		expect(result).toContain("After table.");
	});

	it("multiple headings with content", () => {
		const md =
			"# Title\n\nIntro\n\n## Section 1\n\nContent 1\n\n## Section 2\n\nContent 2";
		const result = c(md);
		expect(result).toContain("h1. Title");
		expect(result).toContain("h2. Section 1");
		expect(result).toContain("h2. Section 2");
		expect(result).toContain("Content 1");
		expect(result).toContain("Content 2");
	});

	it("ordered list with nested unordered + formatting", () => {
		const md = "1. **Step one**\n   - sub a\n   - sub b\n2. Step two";
		expect(c(md)).toEqual("# *Step one*\n#* sub a\n#* sub b\n# Step two");
	});
});

// ─── Code Blocks in Lists ──────────────────────────────────────────

describe("code blocks inside list items", () => {
	it("ordered list item with code block", () => {
		const md = "1. Run this:\n   ```bash\n   bun test\n   ```\n2. Done";
		const result = c(md);
		expect(result).toContain("# Run this:");
		expect(result).toContain("{code:language=bash");
		expect(result).toContain("bun test");
		expect(result).toContain("{code}");
		expect(result).toContain("# Done");
	});

	it("preserves bash comments in code blocks", () => {
		const md =
			"```bash\n# Install dependencies\nbun install\n# Start server\nbun serve\n```";
		const result = c(md);
		expect(result).toContain("# Install dependencies");
		expect(result).toContain("# Start server");
	});

	it("multiple ordered items with code blocks preserve list markers", () => {
		const md = [
			"1. First step",
			"2. Run tests:",
			"   ```bash",
			"   bun test",
			"   ```",
			"3. Deploy:",
			"   ```bash",
			"   bun deploy",
			"   ```",
			"4. Final step",
		].join("\n");
		const result = c(md);
		expect(result).toContain("# First step");
		expect(result).toContain("# Run tests:");
		expect(result).toContain("# Deploy:");
		expect(result).toContain("# Final step");
	});

	it("unordered list item with code block", () => {
		const md = "- Run this:\n  ```js\n  console.log(1)\n  ```\n- Done";
		const result = c(md);
		expect(result).toContain("* Run this:");
		expect(result).toContain("{code:language=javascript");
		expect(result).toContain("* Done");
	});

	it("inline code containing 'code' word not treated as code block", () => {
		const md = "- Use `code` blocks\n- And `{code}` markers";
		const result = c(md);
		expect(result).toContain("* Use {{code}} blocks");
		expect(result).toContain("* And {{{code}}} markers");
	});
});

// ─── Complex Real-World Document ────────────────────────────────────

describe("complex real-world patterns", () => {
	it("README-like document with mixed features", () => {
		const md = [
			"# My Project",
			"",
			"A **bold** description with `inline code`.",
			"",
			"## Getting Started",
			"",
			"```bash",
			"# Install dependencies",
			"npm install",
			"```",
			"",
			"## Features",
			"",
			"- **Bold item** with `code`",
			"- _Italic item_ with [link](https://example.com)",
			"  - Nested child",
			"- ~~Deleted item~~",
			"",
			"| Feature | Status |",
			"| --- | --- |",
			"| Auth | Done |",
			"| API | WIP |",
			"",
			"> **Note:** Important info.",
			"",
			"---",
			"",
			"1. First",
			"2. Second",
			"   1. Sub-item",
		].join("\n");
		const result = c(md);
		expect(result).toContain("h1. My Project");
		expect(result).toContain("*bold*");
		expect(result).toContain("{{inline code}}");
		expect(result).toContain("# Install dependencies");
		expect(result).toContain("* *Bold item* with {{code}}");
		expect(result).toContain("** Nested child");
		expect(result).toContain("[link|https://example.com]");
		expect(result).toContain("-Deleted item-");
		expect(result).toContain("||Feature||Status||");
		expect(result).toContain("|Auth|Done|");
		expect(result).toContain("{quote}");
		expect(result).toContain("----");
		expect(result).toContain("# First");
		expect(result).toContain("## Sub-item");
	});

	it("table with inline code and links in cells", () => {
		const md = [
			"| Export | Description |",
			"| --- | --- |",
			"| `convert(md)` | Convert Markdown |",
			"| `html(md)` | Convert to HTML |",
		].join("\n");
		const result = c(md);
		expect(result).toContain("||Export||Description||");
		expect(result).toContain("|{{convert(md)}}|Convert Markdown|");
		expect(result).toContain("|{{html(md)}}|Convert to HTML|");
	});

	it("link inside table cell", () => {
		const md =
			"| Name | Link |\n| --- | --- |\n| Docs | [here](https://docs.com) |";
		const result = c(md);
		expect(result).toContain("[here|https://docs.com]");
	});

	it("consecutive code blocks with different languages", () => {
		const md = "```typescript\nconst x = 1;\n```\n\n```python\nx = 1\n```";
		const result = c(md);
		expect(result).toContain("{code:language=typescript");
		expect(result).toContain("const x = 1;");
		expect(result).toContain("{code:language=python");
		expect(result).toContain("x = 1");
	});

	it("blockquote with multiple paragraphs and formatting", () => {
		const md =
			"> **Important**: This is a _critical_ note.\n> \n> Second paragraph with `code`.";
		const result = c(md);
		expect(result).toContain("{quote}");
		expect(result).toContain("*Important*");
		expect(result).toContain("_critical_");
		expect(result).toContain("{{code}}");
	});

	it("heading followed immediately by code block", () => {
		const md = "## Setup\n\n```bash\nnpm install\n```";
		const result = c(md);
		expect(result).toContain("h2. Setup");
		expect(result).toContain("{code:language=bash");
		expect(result).toContain("npm install");
	});

	it("nested lists 3 levels with mixed types", () => {
		const md = [
			"1. Top ordered",
			"   - Bullet child",
			"     - Deep bullet",
			"   - Another bullet",
			"2. Second ordered",
		].join("\n");
		const result = c(md);
		expect(result).toContain("# Top ordered");
		expect(result).toContain("#* Bullet child");
		expect(result).toContain("#** Deep bullet");
		expect(result).toContain("# Second ordered");
	});
});

// ─── Edge Cases ─────────────────────────────────────────────────────

describe("edge cases", () => {
	it("empty string", () => {
		expect(convert("")).toEqual("");
	});
	it("only whitespace", () => {
		expect(c("   ")).toEqual("");
	});
	it("plain text with no markdown", () => {
		expect(c("Just plain text")).toEqual("Just plain text");
	});
	it("single word", () => {
		expect(c("hello")).toEqual("hello");
	});
	it("multiple blank lines collapse", () => {
		expect(c("a\n\n\n\nb")).toEqual("a\n\nb");
	});
	it("special characters in text", () => {
		expect(c("a & b < c > d")).toEqual("a & b < c > d");
	});
	it("url in plain text is auto-linked", () => {
		expect(c("visit http://example.com today")).toEqual(
			"visit [http://example.com|http://example.com] today",
		);
	});
});

// ─── verbose() ──────────────────────────────────────────────────────

describe("verbose", () => {
	it("enables debug logging without error", () => {
		verbose();
		// After calling verbose, convert should still work (dbg = console.log)
		expect(c("hello")).toEqual("hello");
	});
});

// ─── Raw HTML passthrough ───────────────────────────────────────────

describe("raw HTML passthrough", () => {
	it("inline HTML tag is preserved", () => {
		expect(c("<br>")).toEqual("<br>");
	});
	it("div block is preserved", () => {
		expect(c("<div>content</div>")).toEqual("<div>content</div>");
	});
});

// ─── html() export (HTML rendering) ────────────────────────────────

describe("html() export", () => {
	it("renders markdown to HTML", () => {
		const result = html("**bold**");
		expect(result).toContain("<strong>bold</strong>");
	});
	it("renders code block with known language", () => {
		const result = html("```javascript\nconsole.log(1)\n```");
		expect(result).toContain("<pre>");
		expect(result).toContain("hljs javascript");
	});
	it("renders code block with unknown language as plaintext", () => {
		const result = html("```unknownlang\nfoo\n```");
		expect(result).toContain("<pre>");
		expect(result).toContain("hljs plaintext");
	});
	it("renders code block without language as plaintext", () => {
		const result = html("```\nbar\n```");
		expect(result).toContain("<pre>");
		expect(result).toContain("hljs plaintext");
	});
});

// ─── fixCommentedCodeBlocks ─────────────────────────────────────────

describe("fixCommentedCodeBlocks", () => {
	it("strips list prefix from code block opening line", () => {
		const input = "# {code:language=bash|collapse=false}\n# echo hi\n{code}";
		const result = fixCommentedCodeBlocks(input);
		expect(result).toContain("{code:language=bash|collapse=false}");
	});
	it("strips list prefix embedded in code block params", () => {
		const input = "{code:language=bash# |collapse=false}\necho hi\n{code}";
		const result = fixCommentedCodeBlocks(input);
		expect(result).toContain("{code:language=bash|collapse=false}");
	});
	it("preserves bash comments inside code blocks", () => {
		const input = "{code:language=bash}\n# echo hi\n#install deps\n{code}";
		const result = fixCommentedCodeBlocks(input);
		expect(result).toContain("# echo hi");
		expect(result).toContain("#install deps");
	});
	it("does not strip '#' from lines outside code blocks", () => {
		const input = "#heading\nsome text\n#another heading";
		const result = fixCommentedCodeBlocks(input);
		expect(result).toEqual("#heading\nsome text\n#another heading");
	});
	it("strips list prefix from code end line", () => {
		const input = "{code:language=bash}\necho hi\n# {code}";
		const result = fixCommentedCodeBlocks(input);
		expect(result).toContain("{code}");
		expect(result).not.toContain("# {code}");
	});
});

// ─── tablerow and tablecell (direct call) ───────────────────────────

describe("JiraRenderer direct method calls", () => {
	it("tablerow appends newline", () => {
		const renderer = new JiraRenderer();
		const result = renderer.tablerow({ text: "||A||B" } as any);
		expect(result).toEqual("||A||B\n");
	});
	it("tablecell formats header cell", () => {
		const renderer = new JiraRenderer();
		new Parser({ renderer } as any);
		const result = renderer.tablecell({
			header: true,
			tokens: [{ type: "text", raw: "Head", text: "Head" }],
		} as any);
		expect(result).toEqual("||Head");
	});
	it("tablecell formats data cell", () => {
		const renderer = new JiraRenderer();
		new Parser({ renderer } as any);
		const result = renderer.tablecell({
			header: false,
			tokens: [{ type: "text", raw: "Data", text: "Data" }],
		} as any);
		expect(result).toEqual("|Data");
	});
});
