# Shell Completion for Schemory CLI

This document explains how to enable tab autocomplete for the Schemory CLI.

## Features

- **Bash completion**: Tab autocomplete for commands and file arguments
- **Zsh completion**: Zsh shell support
- **Smart file suggestions**: When using `schemory push` or `schemory pull`, tab will suggest `.ts` and `.json` files from the current directory
- **Command completion**: Tab autocomplete for all CLI commands
- **Option completion**: Tab autocomplete for command options like `--team`

## Setup

### Bash

1. Generate the completion script:
   ```bash
   npx schemory completion bash > ~/.schemory-completion
   ```

2. Source the completion script in your `.bashrc`:
   ```bash
   echo "source ~/.schemory-completion" >> ~/.bashrc
   source ~/.bashrc
   ```

   Or place it in the system completion directory:
   ```bash
   sudo cp ~/.schemory-completion /etc/bash_completion.d/schemory
   ```

### Zsh

1. Generate the completion script:
   ```bash
   npx schemory completion zsh > ~/.zsh/schemory-completion
   ```

2. Add to your `.zshrc`:
   ```bash
   echo "source ~/.zsh/schemory-completion" >> ~/.zshrc
   exec zsh
   ```

## Usage

Once enabled, tab completion works as follows:

- `npx schemory <TAB>` - Shows all available commands
- `npx schemory push <TAB>` - Shows all `.ts` and `.json` files in current directory
- `npx schemory push my<TAB>` - Shows `.ts` and `.json` files starting with "my"
- `npx schemory push --<TAB>` - Shows available options (`--team`, `--help`)
- `npx schemory pull <TAB>` - Shows all `.ts` and `.json` files in current directory

## Technical Details

The completion script dynamically scans the current directory for files with the following extensions:
- `.ts` - TypeScript files (types)
- `.json` - JSON files (schemas)

These are the only file types supported by Schemory for push/pull operations.

## Troubleshooting

If completion doesn't work:
1. Make sure the completion script was sourced correctly
2. Check that your shell was restarted after adding the source command
3. Verify the completion script exists at the specified location
4. For bash, ensure `bash-completion` package is installed:
   ```bash
   # Ubuntu/Debian
   sudo apt install bash-completion
   ```

## Development

The completion command is implemented in `src/commands/completion.ts` and generates dynamic completion scripts that understand the Schemory CLI structure and file type requirements.