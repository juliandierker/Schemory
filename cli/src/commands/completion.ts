// completion command
// Generates shell completion scripts for schemory CLI
// Usage: schemory completion [bash|zsh] > ~/.schemory-completion

import { Command } from 'commander';

export function createCompletionCommand(): Command {
  return new Command('completion')
    .description('Generate shell completion script for schemory CLI')
    .argument('[shell]', 'Shell type (bash, zsh)', 'bash')
    .action((shell: string) => {
      if (shell === 'bash') {
        console.log(generateBashCompletionScript());
      } else if (shell === 'zsh') {
        console.log(generateZshCompletionScript());
      } else {
        console.error(`Error: Unsupported shell '${shell}'. Use 'bash' or 'zsh'.`);
        process.exit(1);
      }
    });
}

/**
 * Generate bash completion script
 * This script provides tab completion for schemory commands and file arguments
 */
function generateBashCompletionScript(): string {
  const lines: string[] = [];
  lines.push('#!/bin/bash');
  lines.push('# Bash completion script for schemory');
  lines.push('#');
  lines.push('# To use:');
  lines.push('#   1. Save this to ~/.schemory-completion');
  lines.push('#   2. Add to your ~/.bashrc: source ~/.schemory-completion');
  lines.push('#   OR: Place in /etc/bash_completion.d/schemory');
  lines.push('');
  lines.push('_schemory_completions() {');
  lines.push('    local cur prev words cword');
  lines.push('    _init_completion || return');
  lines.push('');
  lines.push('    COMPREPLY=()');
  lines.push('    cur="${COMP_WORDS[COMP_CWORD]}"');
  lines.push('    prev="${COMP_WORDS[COMP_CWORD-1]}"');
  lines.push('    words=("${COMP_WORDS[@]}")');
  lines.push('');
  lines.push('    # Find which command we\'re completing');
  lines.push('    local cmd=""');
  lines.push('    local cmd_index=0');
  lines.push('    local all_commands="signup activate login logout create join invite use status sync push pull pullAll help"');
  lines.push('');
  lines.push('    for ((i=1; i < ${#words[@]}; i++)); do');
  lines.push('        if [[ " ${all_commands} " == *" ${words[i]} "* ]]; then');
  lines.push('            cmd="${words[i]}"');
  lines.push('            cmd_index=$i');
  lines.push('            break');
  lines.push('        fi');
  lines.push('    done');
  lines.push('');
  lines.push('    # Complete command name');
  lines.push('    if [[ -z "$cmd" ]]; then');
  lines.push('        COMPREPLY=( $(compgen -W "$all_commands" -- "$cur") )');
  lines.push('        return 0');
  lines.push('    fi');
  lines.push('');
  lines.push('    # Complete arguments for specific commands');
  lines.push('    case "$cmd" in');
  lines.push('        push)');
  lines.push('            # For push command, complete with .ts and .json files');
  lines.push('            if [[ ${#words[@]} -eq $((cmd_index + 2)) || "$cur" == "${words[cmd_index + 1]}" ]]; then');
  lines.push('                # Find matching .ts and .json files in current directory');
  lines.push('                local files');
  lines.push('                files=$(find . -maxdepth 1 -type f \( -name "*.ts" -o -name "*.json" \) -printf "%f\\n" 2>/dev/null)');
  lines.push('                COMPREPLY=( $(compgen -W "$files" -- "$cur") )');
  lines.push('            elif [[ "$cur" == --* ]]; then');
  lines.push('                COMPREPLY=( $(compgen -W "--team --help" -- "$cur") )');
  lines.push('            fi');
  lines.push('            ;;');
  lines.push('        pull)');
  lines.push('            # For pull command, suggest .ts and .json files');
  lines.push('            if [[ ${#words[@]} -eq $((cmd_index + 2)) || "$cur" == "${words[cmd_index + 1]}" ]]; then');
  lines.push('                local files');
  lines.push('                files=$(find . -maxdepth 1 -type f \( -name "*.ts" -o -name "*.json" \) -printf "%f\\n" 2>/dev/null)');
  lines.push('                COMPREPLY=( $(compgen -W "$files" -- "$cur") )');
  lines.push('            elif [[ "$cur" == --* ]]; then');
  lines.push('                COMPREPLY=( $(compgen -W "--team --help" -- "$cur") )');
  lines.push('            fi');
  lines.push('            ;;');
  lines.push('        *)');
  lines.push('            # For other commands, just complete options');
  lines.push('            if [[ "$cur" == --* ]]; then');
  lines.push('                COMPREPLY=( $(compgen -W "--help" -- "$cur") )');
  lines.push('            fi');
  lines.push('            ;;');
  lines.push('    esac');
  lines.push('');
  lines.push('    return 0');
  lines.push('}');
  lines.push('');
  lines.push('complete -F _schemory_completions schemory');
  lines.push('complete -F _schemory_completions npx');
  
  return lines.join('\n');
}

/**
 * Generate zsh completion script
 */
function generateZshCompletionScript(): string {
  const lines: string[] = [];
  lines.push('#compdef schemory');
  lines.push('');
  lines.push('# Zsh completion for schemory CLI');
  lines.push('');
  lines.push('_schemory() {');
  lines.push('    local -a commands');
  lines.push('    commands=(');
  lines.push('        \'signup:Sign up with email\'');
  lines.push('        \'activate:Activate account with token\'');
  lines.push('        \'login:Login with email\'');
  lines.push('        \'logout:Logout from current session\'');
  lines.push('        \'create:Create a new team\'');
  lines.push('        \'join:Join a team with join code\'');
  lines.push('        \'invite:Get team join code\'');
  lines.push('        \'use:Switch active team\'');
  lines.push('        \'status:Show current status\'');
  lines.push('        \'sync:Sync CLI configuration\'');
  lines.push('        \'push:Push a type or schema file\'');
  lines.push('        \'pull:Pull schemas and types\'');
  lines.push('        \'pullAll:Pull all team items\'');
  lines.push('        \'help:Show help\'');
  lines.push('    )');
  lines.push('');
  lines.push('    _describe -t schemory-commands \'schemory command\' commands');
  lines.push('}');
  lines.push('');
  lines.push('_schemory "$@"');
  
  return lines.join('\n');
}
