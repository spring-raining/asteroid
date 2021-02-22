import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor, {
  OnMount as OnEditorMount,
  BeforeMount as BeforeEditorMount,
} from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { css } from 'lightwindcss';

const useAsyncEvent = (callback: (...args: any[]) => void) => {
  const eventStack = useRef<any[][]>([]);
  useEffect(() => {
    let id: number;
    const tick = () => {
      if (eventStack.current.length > 0) {
        callback(...eventStack.current.shift()!);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [callback]);

  const handler = useCallback((...args) => {
    eventStack.current.push(args);
  }, []);
  return handler;
};

export interface EditorProps {
  code?: string;
  language?: 'javascript' | 'markdown';
  onEditorUpdate?: (editor: any) => void;
  onChange?: (code: string) => void;
  onCreateNewBlockCommand?: () => void;
  onMoveForwardCommand?: () => void;
  onMoveBackwardCommand?: () => void;
  onFocus?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  language,
  onEditorUpdate = () => {},
  onChange = () => {},
  onCreateNewBlockCommand = () => {},
  onMoveForwardCommand = () => {},
  onMoveBackwardCommand = () => {},
  onFocus = () => {},
}) => {
  const [initialCode] = useState(() => code);
  // const monaco = useMonaco();
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(
    null
  );
  const createNewBlockCommandHandler = useAsyncEvent(onCreateNewBlockCommand);
  const moveForwardCommandHandler = useAsyncEvent(onMoveForwardCommand);
  const moveBackwardCommandHandler = useAsyncEvent(onMoveBackwardCommand);
  const focusHandler = useAsyncEvent(onFocus);
  const changeHandler = useAsyncEvent(onChange);

  // 1. get Monaco instance
  const beforeEditorMount: BeforeEditorMount = (monaco) => {
    if (!monaco) {
      return;
    }
    monaco.editor.defineTheme('asteroidLightTheme', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#00000000',
      },
    });
    monaco.editor.defineTheme('asteroidDarkTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#00000000',
      },
    });
  };

  // 2. mount editor component and handle editor changes
  const onEditorMount: OnEditorMount = (editor, monaco) => {
    if (!monaco) {
      return;
    }
    setEditor(editor);
    onEditorUpdate(editor);
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      createNewBlockCommandHandler
    );
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.UpArrow,
      moveBackwardCommandHandler
    );
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.DownArrow,
      moveForwardCommandHandler
    );
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      changeHandler(value);
    });
    editor.onDidFocusEditorText(focusHandler);
  };

  useEffect(() => {
    if (!editor) {
      return;
    }
    // https://github.com/microsoft/monaco-editor/issues/794
    let prevHeight = 0;
    const updateEditorHeight = () => {
      const el = editor.getDomNode();
      if (!el) {
        return;
      }
      const contentHeight = editor.getContentHeight();
      if (prevHeight !== contentHeight) {
        prevHeight = contentHeight;
        requestAnimationFrame(() => {
          el.style.height = `${contentHeight}px`;
          editor.layout();
        });
      }
    };
    updateEditorHeight();
    editor.onDidContentSizeChange(() => {
      updateEditorHeight();
    });
  }, [editor]);

  return (
    <div
      className={css`
        height: 100%;
      `}
    >
      <MonacoEditor
        defaultValue={initialCode}
        language={language}
        options={{
          minimap: { enabled: false },
          fontFamily:
            'SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
          lineHeight: 18,
          lineNumbers: 'off',
          scrollBeyondLastLine: false,
          scrollbar: {
            alwaysConsumeMouseWheel: false,
          },
        }}
        theme="asteroidLightTheme"
        loading={<></>}
        beforeMount={beforeEditorMount}
        onMount={onEditorMount}
      />
    </div>
  );
};