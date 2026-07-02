import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../contexts/ThemeContext';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: 'json' | 'typescript';
  className?: string;
  readOnly?: boolean;
  height?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'json',
  className = '',
  readOnly = false,
  height = '400px',
}) => {
  const { theme } = useTheme();
  const [editorTheme, setEditorTheme] = useState<'vs-light' | 'vs-dark' | 'hc-light' | 'hc-black'>('vs-light');

  // Update editor theme when system theme changes
  useEffect(() => {
    setEditorTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
  }, [theme]);

  // Get file extension for the language
  const getFileExtension = () => {
    switch (language) {
      case 'json':
        return 'json';
      case 'typescript':
        return 'ts';
      default:
        return 'txt';
    }
  };

  // Editor options
  const editorOptions: any = {
    readOnly,
    minimap: {
      enabled: false,
    },
    fontSize: 14,
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    roundedSelection: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    // @ts-ignore - this is a valid monaco option
    'semanticHighlighting.enabled': true,
  };

  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className={`rounded-lg overflow-hidden border border-secondary-300 dark:border-secondary-600 ${className}`}>
      <div className="bg-secondary-100 dark:bg-secondary-800 px-4 py-2 border-b border-secondary-300 dark:border-secondary-600 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-3 text-sm font-medium text-secondary-600 dark:text-secondary-400">
            {language === 'json' ? 'JSON Schema' : 'TypeScript'}
          </span>
        </div>
        <span className="text-xs text-secondary-500 dark:text-secondary-400">
          .{getFileExtension()}
        </span>
      </div>
      
      <Editor
        height={height}
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={handleChange}
        theme={editorTheme}
        options={editorOptions}
        className="monaco-editor"
      />
    </div>
  );
};

export default CodeEditor;
