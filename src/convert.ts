import hljs from "highlight.js";
import { marked, Renderer, type Tokens } from "marked";

let dbg = (...args: unknown[]) => {};
export function verbose() {
	dbg = console.log;
}

export const MAX_CODE_LINE = 20 as const;
export const LANGS = {
	// Shell variants
	shell: "bash",
	bash: "bash",
	zsh: "bash",
	sh: "bash",

	// Jira-supported languages
	actionscript3: "actionscript3",
	applescript: "applescript",
	c: "cpp",
	csharp: "csharp",
	coldfusion: "coldfusion",
	cpp: "cpp",
	css: "css",
	delphi: "delphi",
	diff: "diff",
	erlang: "erlang",
	groovy: "groovy",
	"html/xml": "html/xml",
	java: "java",
	javafx: "javafx",
	javascript: "javascript",
	json: "json",
	kotlin: "kotlin",
	lua: "lua",
	none: "none",
	nyan: "nyan",
	objc: "objc",
	pascal: "pascal",
	perl: "perl",
	php: "php",
	plaintext: "plaintext",
	powershell: "powershell",
	python: "python",
	r: "r",
	ruby: "ruby",
	rust: "rust",
	sass: "sass",
	scala: "scala",
	sql: "sql",
	swift: "swift",
	typescript: "typescript",
	vb: "vb",
	xml: "html/xml",
	yaml: "yaml",

	// Common aliases
	js: "javascript",
	jsx: "javascript",
	mjs: "javascript",
	ts: "typescript",
	tsx: "typescript",
	py: "python",
	rb: "ruby",
	rs: "rust",
	cs: "csharp",
	"c#": "csharp",
	"c++": "cpp",
	"objective-c": "objc",
	objectivec: "objc",
	yml: "yaml",
	html: "html/xml",
	htm: "html/xml",
	xhtml: "html/xml",
	kt: "kotlin",
	ps1: "powershell",
	pl: "perl",
	scss: "sass",
	vbnet: "vb",
	patch: "diff",
	text: "plaintext",
	txt: "plaintext",
} as const;

export class JiraRenderer extends Renderer {
	private _listDepth: string[] = [];

	paragraph({ tokens }: Tokens.Paragraph): string {
		const body = this.parser.parseInline(tokens);
		dbg(`Paragraph`, body);
		return body + "\n\n";
	}
	html({ text }: Tokens.HTML): string {
		dbg(`HTML: ${text}`);
		return text;
	}
	heading({ tokens, depth }: Tokens.Heading): string {
		const body = this.parser.parseInline(tokens);
		dbg(`Heading: ${body}`);
		return `h${depth}. ${body}\n\n`;
	}
	strong({ tokens }: Tokens.Strong): string {
		const body = this.parser.parseInline(tokens);
		dbg(`Strong: ${body}`);
		return `*${body}*`;
	}
	em({ tokens }: Tokens.Em): string {
		const body = this.parser.parseInline(tokens);
		dbg(`Em: ${body}`);
		return `_${body}_`;
	}
	del({ tokens }: Tokens.Del): string {
		const body = this.parser.parseInline(tokens);
		dbg(`Del: ${body}`);
		return `-${body}-`;
	}
	codespan({ text }: Tokens.Codespan): string {
		dbg(`Codespan: ${text}`);
		return `{{${text}}}`;
	}
	blockquote({ tokens }: Tokens.Blockquote): string {
		const body = this.parser.parse(tokens);
		dbg(`Blockquote: ${body}`);
		return `{quote}${body}{quote}\n`;
	}
	br(): string {
		return "\n";
	}
	hr(): string {
		return "----\n\n";
	}
	link({ href, tokens }: Tokens.Link): string {
		const body = this.parser.parseInline(tokens);
		return `[${body != null ? `${body}|${href}` : href}]`;
	}
	list(token: Tokens.List): string {
		const type = token.ordered ? "#" : "*";
		this._listDepth.push(type);
		let body = "";
		for (const item of token.items) {
			body += this.listitem(item);
		}
		this._listDepth.pop();
		// Only add trailing newline for top-level lists
		return this._listDepth.length === 0 ? body + "\n" : body;
	}
	listitem(item: Tokens.ListItem): string {
		const prefix = this._listDepth.join("");
		let itemText = "";
		// Render tokens, separating nested lists and block-level elements from inline content
		for (const token of item.tokens) {
			if (token.type === "list") {
				itemText = itemText.trimEnd() + "\n" + this.parser.parse([token]);
			} else if (token.type === "code" || token.type === "blockquote") {
				// Block-level tokens need to be separated from preceding text
				itemText = itemText.trimEnd() + "\n" + this.parser.parse([token]);
			} else {
				itemText += this.parser.parse([token]);
			}
		}
		return `${prefix} ${itemText.trim()}\n`;
	}
	image({ href }: Tokens.Image): string {
		return `!${href}!`;
	}
	table(token: Tokens.Table): string {
		let result = "";
		// header
		let headerRow = "";
		for (const cell of token.header) {
			headerRow += "||" + this.parser.parseInline(cell.tokens);
		}
		result += headerRow + "||\n";
		// rows
		for (const row of token.rows) {
			let rowStr = "";
			for (const cell of row) {
				rowStr += "|" + this.parser.parseInline(cell.tokens);
			}
			result += rowStr + "|\n";
		}
		return result + "\n";
	}
	tablerow({ text }: Tokens.TableRow): string {
		return text + "\n";
	}
	tablecell({ header, tokens }: Tokens.TableCell): string {
		const type = header ? "||" : "|";
		return type + this.parser.parseInline(tokens);
	}
	code({ text, lang }: Tokens.Code): string {
		return `{code:language=${(LANGS as any)[lang ?? ""] ?? ""}|borderStyle=solid|theme=RDark|linenumbers=true|collapse=${text.split("\n").length > MAX_CODE_LINE}}\n${text}\n{code}\n\n`;
	}
	text(token: Tokens.Text): string {
		if ("tokens" in token && token.tokens) {
			return this.parser.parseInline(token.tokens);
		}
		dbg(`Text: ${token.text}`);
		return token.text;
	}
	checkbox({ checked }: Tokens.Checkbox): string {
		return checked ? "[x] " : "[-] ";
	}
}

/**
 * Pre-processes markdown source to fix common authoring errors,
 * making the subsequent markdown → Jira conversion more robust.
 *
 * Fixes applied (only outside fenced code blocks):
 * - Missing space after `#` in headings (`##Heading` → `## Heading`)
 * - Missing space after list markers (`-item` → `- item`, `1.item` → `1. item`)
 * - Missing blank line before headings, lists, blockquotes, code fences, and HRs
 * - Collapse 3+ consecutive blank lines to 2
 * - Missing space after `>` in blockquotes
 */
export function correctMarkdown(markdown: string): string {
	const lines = markdown.split("\n");
	const result: string[] = [];
	let inFencedCode = false;

	for (let i = 0; i < lines.length; i++) {
		const rawLine = lines[i];
		if (rawLine === undefined) continue;
		let line = rawLine;

		// Track fenced code blocks (``` or ~~~) — don't modify inside them
		if (/^(\s*)(```|~~~)/.test(line)) {
			if (!inFencedCode) {
				inFencedCode = true;
				// Ensure blank line before code fence
				const prev = result[result.length - 1];
				if (result.length > 0 && prev !== undefined && prev.trim() !== "") {
					result.push("");
				}
				result.push(line);
				continue;
			} else {
				inFencedCode = false;
				result.push(line);
				continue;
			}
		}

		if (inFencedCode) {
			result.push(line);
			continue;
		}

		// Fix: missing space after # in headings (e.g. ##Heading → ## Heading)
		// Only match lines that start with 1-6 # followed by a non-space, non-# char
		line = line.replace(/^(#{1,6})([^\s#])/, "$1 $2");

		// Fix: missing space after unordered list marker (e.g. -item → - item)
		// Only at start of line with optional leading whitespace
		line = line.replace(/^(\s*)([-*+])([^\s\-*+])/, "$1$2 $3");

		// Fix: missing space after ordered list marker (e.g. 1.item → 1. item)
		line = line.replace(/^(\s*)(\d+\.)([^\s])/, "$1$2 $3");

		// Fix: missing space after > in blockquotes
		line = line.replace(/^(\s*)(>)([^\s>])/, "$1$2 $3");

		// Determine if this line needs a blank line before it
		const prevLine = result.length > 0 ? (result[result.length - 1] ?? "") : "";
		const prevIsBlank = prevLine.trim() === "";

		if (!prevIsBlank && result.length > 0) {
			const isHeading = /^#{1,6}\s/.test(line);
			const isListStart =
				/^\s*[-*+]\s/.test(line) && !/^\s*[-*+]\s/.test(prevLine);
			const isOrderedListStart =
				/^\s*\d+\.\s/.test(line) && !/^\s*\d+\.\s/.test(prevLine);
			const isBlockquote = /^\s*>\s/.test(line) && !/^\s*>\s/.test(prevLine);
			const isHr = /^\s*([-*_]){3,}\s*$/.test(line);
			const isCodeFence = /^\s*(```|~~~)/.test(line);

			if (
				isHeading ||
				isListStart ||
				isOrderedListStart ||
				isBlockquote ||
				isHr ||
				isCodeFence
			) {
				result.push("");
			}
		}

		result.push(line);
	}

	// Collapse 3+ consecutive blank lines to 2
	let output = result.join("\n");
	output = output.replace(/\n{4,}/g, "\n\n\n");

	// Trim leading blank lines
	output = output.replace(/^\n+/, "");

	return output;
}

export function convert(markdown: string, correct = false): string {
	const source = correct ? correctMarkdown(markdown) : markdown;
	const result = <string>(
		marked(source, { renderer: new JiraRenderer(), async: false })
	);
	return fixDoubleUnderscore(fixCommentedCodeBlocks(result));
}

/**
 * Processes a markdown string line by line, applying different transformations
 * based on whether the line is inside or outside a code block.
 *
 * @param markdown The input markdown string.
 * @param onCodeStartLine A lambda function to apply to lines that starts the code block
 * @param onCodeBlockLine A lambda function to apply to lines within a code block.
 * @param onCodeEndLine A lambda function to apply to lines that ends the code block
 * @param onNonCodeBlockLine A lambda function to apply to lines outside a code block
 * @returns The transformed markdown string.
 */
export function processCodeBlockLines(
	markdown: string,
	onCodeStartLine: (line: string) => string, // {code:
	onCodeBlockLine: (line: string) => string, // let inCode = true;
	onCodeEndLine: (line: string) => string, // {code}
	onNonCodeBlockLine: (line: string) => string, // Out of the code block!
): string {
	// Match {code} or {code:...} but NOT {{code}} (Jira inline monospace)
	const reCodeEnd = /(?<!\{)\{code\}(?!\})/;
	const reCodeStart = /(?<!\{)\{code[:}]/;

	let inCodeBlock = false; // keep track if we are inside a code block
	// split by lines and map through them to apply transformation
	return markdown
		.split("\n")
		.map((line) => {
			// check if this line is the start or end of a code block
			if (inCodeBlock && reCodeEnd.test(line)) {
				inCodeBlock = false;
				return onCodeEndLine(line);
			} else if (!inCodeBlock && reCodeStart.test(line)) {
				inCodeBlock = true;
				return onCodeStartLine(line);
			}

			if (inCodeBlock) {
				return onCodeBlockLine(line);
			} else {
				return onNonCodeBlockLine(line);
			}
		})
		.join("\n"); // join back to get the transformed string
}

/**
 * Strip Jira ordered-list prefixes (e.g. `# `, `## `) that leak into
 * `{code}` boundary lines when a code block is inside a list item.
 * Content *inside* code blocks is never modified (bash comments etc. are preserved).
 */
export function fixCommentedCodeBlocks(markdown: string): string {
	return processCodeBlockLines(
		markdown,
		(line) => line.replace(/^([#*]+\s)+/, "").replace(/([#*]+\s)+(?=\|)/g, ""), // strip list prefixes from code start line
		(line) => line, // preserve code block content as-is
		(line) => line.replace(/^([#*]+\s)+/, ""), // strip list prefixes from code end line
		(line) => line, // out of code, do nothing
	);
}

/**
 * Post processor to fix one__two three__four causing italics to 'three four' in jira.
 *
 * If not in a code block, replace __ with \_\_
 * __bold__ will have been converted to *bold* already, so we can escape any remaining __
 * @param markdown to post process __'s
 */
export function fixDoubleUnderscore(markdown: string) {
	return processCodeBlockLines(
		markdown,
		(s) => s, // start code
		(s) => s, // in code
		(s) => s, // end of code
		(s) => s.replaceAll("__", "\\_\\_"), // replace __ with \_ when out of code
	);
}

function validLanguage(language?: string): string {
	if (language === undefined) {
		return "plaintext";
	}
	if (hljs.getLanguage(language) === undefined) {
		return "plaintext";
	}
	return language;
}

class HTMLRenderer extends Renderer {
	code({ text, lang, escaped }: Tokens.Code): string {
		const language = validLanguage(lang);
		return `<pre><code class="hljs ${language}">${hljs.highlight(text, { language }).value}</code></pre>`;
	}
}

export function html(markdown: string): string {
	return marked(markdown, {
		renderer: new HTMLRenderer(),
		pedantic: false,
		gfm: true,
		breaks: false,
		async: false,
	});
}
