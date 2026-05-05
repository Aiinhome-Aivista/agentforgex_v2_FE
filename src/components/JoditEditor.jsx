import React, { useMemo } from 'react';
import JoditReact from 'jodit-react';
import 'jodit/es2021/jodit.min.css';

const JoditEditor = ({ content, setContent, config: userConfig }) => {
  const config = useMemo(() => ({
    readonly: false,
    toolbarButtonSize: 'middle',
    theme: 'dark',
    height: 400,
    toolbarAdaptive: false,
    toolbarSticky: false,
    buttons: [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'image', 'video', 'table', 'link', '|',
      'align', 'undo', 'redo', '|',
      'hr', 'eraser', 'fullsize', 'source'
    ],
    placeholder: 'Start writing your blog content here...',
    uploader: {
      insertImageAsBase64URI: true, // Use base64 instead of requiring an upload endpoint
    },
    style: {
      background: '#0e0e10', // Match Agentforgex bg
      color: '#f8fafc',
    },
    ...userConfig
  }), [userConfig]);

  return (
    <div className="jodit-editor-wrapper text-slate-800">
      <style>
        {`
        .jodit-container {
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            background-color: #0e0e10 !important;
            border-radius: 0.5rem;
        }
        .jodit-toolbar__box {
            background-color: rgba(255, 255, 255, 0.03) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .jodit-toolbar-button__button {
            color: #cbd5e1 !important;
        }
        .jodit-toolbar-button__button:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .jodit-workplace {
            background-color: rgba(0, 0, 0, 0.4) !important;
        }
        .jodit-wysiwyg {
            color: #f1f5f9 !important;
            background-color: transparent !important;
        }
        .jodit-wysiwyg ul {
            list-style-type: disc;
            padding-left: 2rem !important;
            margin: 1em 0 !important;
        }
        .jodit-wysiwyg ol {
            list-style-type: decimal;
            padding-left: 2rem !important;
            margin: 1em 0 !important;
        }
        .jodit-wysiwyg li {
            display: list-item !important;
        }
        .jodit-status-bar {
            background-color: rgba(255, 255, 255, 0.03) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #94a3b8 !important;
        }
        .jodit-ui-button_active {
            background-color: rgba(255, 255, 255, 0.15) !important;
        }
        `}
      </style>
      <JoditReact
        value={content}
        config={config}
        onBlur={(newContent) => setContent(newContent)}
        onChange={() => {}}
      />
    </div>
  );
};

export default JoditEditor;
