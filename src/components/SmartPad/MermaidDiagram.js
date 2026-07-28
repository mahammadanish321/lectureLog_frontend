import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MermaidDiagramComponent from './MermaidDiagramComponent';

export const MermaidDiagram = Node.create({
  name: 'mermaidDiagram',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n  A-->B',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mermaid-diagram',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mermaid-diagram', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidDiagramComponent);
  },
});
