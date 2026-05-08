#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${HOME}/.local/bin"
SKILL_DIR="${HOME}/.claude/skills/md2jira"

echo "Building md2jira binary..."
cd "$SCRIPT_DIR"
bun build --compile cli.ts --outfile md2jira

echo "Installing binary to ${INSTALL_DIR}/md2jira..."
mkdir -p "$INSTALL_DIR"
cp md2jira "$INSTALL_DIR/md2jira"

echo "Installing Claude Code skill to ${SKILL_DIR}/SKILL.md..."
mkdir -p "$SKILL_DIR"
cp skill/SKILL.md "$SKILL_DIR/SKILL.md"

# Check if ~/.local/bin is on PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
  echo ""
  echo "WARNING: ${INSTALL_DIR} is not on your PATH."
  echo "Add the following to your shell profile (~/.zshrc or ~/.bashrc):"
  echo ""
  echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
  echo ""
fi

echo "Done! You can now use 'md2jira' from the command line and '/md2jira' in Claude Code."
