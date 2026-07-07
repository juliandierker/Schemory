import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { useTheme } from '../context/ThemeContext';
import { useEffect } from 'react';

interface CodeEditorProps {
  content: string;
  language?: 'json' | 'typescript' | 'javascript' | 'text';
  readOnly?: boolean;
  className?: string;
  onChange?: (content: string) => void;
}

// Map file extensions/ItemKind to CodeMirror language support
const getLanguageExtension = (language?: string) => {
  switch (language) {
    case 'json':
      return json();
    case 'typescript':
      return javascript({ jsx: true, typescript: true });
    case 'javascript':
      return javascript({ jsx: true, typescript: false });
    default:
      return null; // Plain text
  }
};

// Detect language from content if not specified
const detectLanguageFromContent = (content: string): string => {
  if (!content) return 'text';
  
  const trimmedContent = content.trim();
  
  // Check for TypeScript
  if (trimmedContent.startsWith('type ') || 
      trimmedContent.startsWith('interface ') ||
      trimmedContent.includes('import type') ||
      trimmedContent.includes('export type') ||
      trimmedContent.includes(': ')) {
    return 'typescript';
  }
  
  // Check for JSON
  if (trimmedContent.startsWith('{') || 
      trimmedContent.startsWith('[') ||
      trimmedContent.includes('"')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {
      // Not valid JSON, continue checking
    }
  }
  
  // Check for JavaScript
  if (trimmedContent.startsWith('const ') ||
      trimmedContent.startsWith('let ') ||
      trimmedContent.startsWith('function ') ||
      trimmedContent.includes('=>')) {
    return 'javascript';
  }
  
  return 'text';
};

// Map detected language to CodeMirror extension
const getExtensionForDetectedLanguage = (language: string) => {
  switch (language) {
    case 'json':
      return json();
    case 'typescript':
      return javascript({ jsx: true, typescript: true });
    case 'javascript':
      return javascript({ jsx: true, typescript: false });
    default:
      return null;
  }
};

export default function CodeEditor({
  content,
  language: providedLanguage,
  readOnly = true,
  className = '',
  onChange
}: CodeEditorProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Detect language from content if not provided
  const detectedLanguage = providedLanguage || detectLanguageFromContent(content);
  const languageExtension = providedLanguage 
    ? getLanguageExtension(providedLanguage)
    : getExtensionForDetectedLanguage(detectedLanguage);
  
  // Get theme based on current theme mode
  const editorTheme = isDarkMode ? githubDark : githubLight;

  // Handle content changes
  const handleChange = (value: string, viewUpdate: any) => {
    if (onChange && value !== content) {
      onChange(value);
    }
  };

  return (
    <div className={`code-editor-container ${className}`}>
      <CodeMirror
        value={content}
        height="auto"
        theme={editorTheme}
        extensions={[languageExtension].filter(Boolean) as any}
        readOnly={readOnly}
        onChange={!readOnly ? handleChange : undefined}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
        className="code-mirror-editor"
      />
    </div>
  );
}