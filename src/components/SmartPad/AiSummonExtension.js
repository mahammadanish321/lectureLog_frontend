import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const AiSummonExtension = Extension.create({
  name: 'aiSummon',

  addOptions() {
    return {
      onSummon: () => {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('aiSummon'),
        props: {
          handleKeyDown: (view, event) => {
            // Listen for Spacebar or Slash
            if (event.key === ' ' || event.key === '/') {
              const { state } = view;
              const { selection } = state;
              const { $anchor } = selection;

              // Ensure the selection is empty (no text selected)
              if (!selection.empty) return false;

              // Check if the current node is a paragraph and is completely empty
              if ($anchor.parent.type.name === 'paragraph' && $anchor.parent.textContent === '') {
                // Prevent the space/slash from actually being typed
                event.preventDefault();
                
                // Get screen coordinates of the cursor
                const coords = view.coordsAtPos($anchor.pos);
                
                // Trigger the callback with position data
                this.options.onSummon({
                  pos: $anchor.pos,
                  top: coords.top,
                  left: coords.left,
                  bottom: coords.bottom,
                });
                
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
