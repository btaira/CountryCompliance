---
name: Example Config
description: An agent capable of seeing and modifying files in the folder
version: 1.0.0
schema: v1
models:
  - name: Gemma4
    provider: ollama
    model: Gemma4
  - uses: ollama/qwen2.5-coder-7b
mcpServers:
  - uses: anthropic/memory-mcp
  - name: Filesystem MCP
    command: npx.cmd
    args:
      - "-y"
      - "@modelcontextprotocol/server-filesystem"
      - "${workspaceFolder}"
      - "C:\\Users\\btair\\OneDrive\\Documents\\GitHub"
tools:
  - list_dir
  - read_file
  - grep_search
  - replace_string_in_file
  - create_file
  - run_in_terminal
---

This agent is configured to access file system tools for listing directories, reading files, searching, modifying, creating, and running terminal commands.
