---
name: md2jira
description: Convert markdown text to JIRA wiki markup. Use when the user asks to convert markdown to JIRA, format text for JIRA, or asks for JIRA wiki markup.
allowed-tools: Bash, Read
---

# md2jira

Convert markdown to JIRA wiki markup using the markdown-to-jira converter.

## Instructions

1. Determine the markdown content to convert:
   - If `$ARGUMENTS` contains a file path, use the Read tool to get the file contents first
   - If `$ARGUMENTS` contains inline markdown text, use that directly
   - If `$ARGUMENTS` is empty, ask the user what markdown they want to convert

2. Pipe the markdown content through the CLI converter:
   ```
   echo '<markdown_content>' | md2jira
   ```
   For multiline content, use a heredoc:
   ```
   md2jira <<'MDEOF'
   <markdown_content>
   MDEOF
   ```

3. Present the JIRA wiki markup output to the user in a code block.
