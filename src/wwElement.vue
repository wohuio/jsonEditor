<template>
  <div class="json-editor-wrapper" :style="wrapperStyle">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { createJSONEditor } from 'vanilla-jsoneditor';

export default {
  name: 'JSONEditor',
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    const editorContainer = ref(null);
    let editor = null;

    // Internal variable to store current JSON value (output variable)
    const { value: currentValue, setValue: setCurrentValue } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'json',
      type: 'object',
      defaultValue: props.content?.initialValue || {},
    });

    // Computed style for wrapper
    const wrapperStyle = computed(() => ({
      height: props.content?.height || '400px',
      width: '100%',
    }));

    // Global click handler to close menus
    const handleGlobalClick = (event) => {
      // Find all context menus and modals
      const contextMenus = document.querySelectorAll('.jse-contextmenu, .jse-modal-overlay, .jse-popup');

      contextMenus.forEach(menu => {
        // Check if the click was outside the menu
        if (menu && !menu.contains(event.target)) {
          // Remove the menu element
          const parent = menu.parentElement;
          if (parent) {
            parent.removeChild(menu);
          }
        }
      });
    };

    // ESC key handler to close menus
    const handleEscKey = (event) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        // Find and remove all context menus and modals
        const menus = document.querySelectorAll('.jse-contextmenu, .jse-modal-overlay, .jse-popup');
        menus.forEach(menu => {
          const parent = menu.parentElement;
          if (parent) {
            parent.removeChild(menu);
          }
        });
      }
    };

    // Initialize editor
    onMounted(async () => {
      await nextTick();

      if (!editorContainer.value) {
        console.error('Editor container not found');
        return;
      }

      try {
        const initialContent = props.content?.initialValue || {};

        editor = createJSONEditor({
          target: editorContainer.value,
          props: {
            content: {
              json: initialContent,
            },
            mode: props.content?.mode || 'tree',
            mainMenuBar: props.content?.mainMenuBar ?? true,
            navigationBar: props.content?.navigationBar ?? true,
            statusBar: props.content?.statusBar ?? true,
            readOnly: props.content?.readOnly ?? false,
            indentation: props.content?.indentation || 2,
            onChange: (updatedContent) => {
              try {
                if (updatedContent?.json !== undefined) {
                  const newValue = updatedContent.json;
                  setCurrentValue(newValue);
                  console.log('JSON Editor value changed:', newValue);
                  emit('trigger-event', {
                    name: 'change',
                    event: { value: newValue },
                  });
                }
              } catch (error) {
                console.error('Error handling change:', error);
                emit('trigger-event', {
                  name: 'error',
                  event: { error: error?.message || String(error) },
                });
              }
            },
            onError: (error) => {
              console.error('Editor error:', error);
              emit('trigger-event', {
                name: 'error',
                event: { error: error?.message || String(error) },
              });
            },
          },
        });

        // Set initial value in output variable
        setCurrentValue(initialContent);

        console.log('JSON Editor initialized with value:', initialContent);

        // Add global event listeners with a slight delay to prevent immediate trigger
        setTimeout(() => {
          document.addEventListener('click', handleGlobalClick, true);
          document.addEventListener('keydown', handleEscKey, true);
        }, 100);
      } catch (error) {
        console.error('Error initializing editor:', error);
        emit('trigger-event', {
          name: 'error',
          event: { error: error?.message || String(error) },
        });
      }
    });

    // Watch for initialValue changes
    watch(
      () => props.content?.initialValue,
      (newValue) => {
        if (!editor) return;

        try {
          if (newValue !== undefined && newValue !== null) {
            editor.set({ json: newValue });
            setCurrentValue(newValue);
          }
        } catch (error) {
          console.error('Error setting initial value:', error);
        }
      },
      { deep: true }
    );

    // Watch for mode changes
    watch(
      () => props.content?.mode,
      (newMode) => {
        if (!editor || !newMode) return;

        try {
          editor.updateProps({ mode: newMode });
        } catch (error) {
          console.error('Error updating mode:', error);
        }
      }
    );

    // Watch for other property changes
    watch(
      () => [
        props.content?.mainMenuBar,
        props.content?.navigationBar,
        props.content?.statusBar,
        props.content?.readOnly,
        props.content?.indentation,
      ],
      () => {
        if (!editor) return;

        try {
          editor.updateProps({
            mainMenuBar: props.content?.mainMenuBar ?? true,
            navigationBar: props.content?.navigationBar ?? true,
            statusBar: props.content?.statusBar ?? true,
            readOnly: props.content?.readOnly ?? false,
            indentation: props.content?.indentation || 2,
          });
        } catch (error) {
          console.error('Error updating props:', error);
        }
      },
      { deep: true }
    );

    // Cleanup
    onBeforeUnmount(() => {
      // Remove event listeners
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('keydown', handleEscKey, true);

      if (editor) {
        try {
          editor.destroy();
        } catch (error) {
          console.error('Error destroying editor:', error);
        }
        editor = null;
      }
    });

    return {
      editorContainer,
      wrapperStyle,
    };
  },
};
</script>

<style lang="scss">
.json-editor-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: visible !important;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;

  .editor-container {
    width: 100%;
    height: 100%;
    min-height: 200px;
    overflow: visible;
    border-radius: 12px;
  }

  // Modern styling for the JSON editor
  :deep(.jse-main) {
    position: relative;
    overflow: visible;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    border: none !important;
  }

  // Menu bar styling
  :deep(.jse-menu) {
    background: #f9fafb !important;
    border-bottom: 1px solid #e5e7eb !important;
    padding: 8px 12px !important;
    border-radius: 12px 12px 0 0 !important;
  }

  :deep(.jse-button) {
    background: transparent !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 6px 12px !important;
    color: #374151 !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
    font-size: 13px !important;

    &:hover {
      background: #e5e7eb !important;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  // Content area
  :deep(.jse-contents) {
    background: #ffffff !important;
    border-radius: 0 0 12px 12px !important;
  }

  // Tree view styling
  :deep(.jse-tree-mode) {
    background: #ffffff !important;
  }

  :deep(.jse-value),
  :deep(.jse-key) {
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
    font-size: 13px !important;
  }

  :deep(.jse-key) {
    color: #3b82f6 !important;
    font-weight: 500 !important;
  }

  :deep(.jse-value.jse-string) {
    color: #059669 !important;
  }

  :deep(.jse-value.jse-number) {
    color: #dc2626 !important;
  }

  :deep(.jse-value.jse-boolean) {
    color: #7c3aed !important;
  }

  :deep(.jse-value.jse-null) {
    color: #6b7280 !important;
  }

  // Search box styling
  :deep(.jse-search) {
    background: #f9fafb !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px !important;
    padding: 6px 12px !important;
    transition: all 0.2s ease !important;

    &:focus {
      outline: none !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
  }

  // Status bar
  :deep(.jse-status-bar) {
    background: #f9fafb !important;
    border-top: 1px solid #e5e7eb !important;
    padding: 8px 12px !important;
    color: #6b7280 !important;
    font-size: 12px !important;
    border-radius: 0 0 12px 12px !important;
  }

  // Navigation bar
  :deep(.jse-navigation-bar) {
    background: #f9fafb !important;
    border-bottom: 1px solid #e5e7eb !important;
    padding: 8px 12px !important;
  }

  // Modals and popups
  :deep(.jse-modal),
  :deep(.jse-contextmenu),
  :deep(.jse-popup),
  :deep(.jse-modal-overlay) {
    z-index: 9999 !important;
    pointer-events: auto !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }

  :deep(.jse-modal-overlay) {
    background: rgba(0, 0, 0, 0.4) !important;
    backdrop-filter: blur(4px);
  }

  :deep(.jse-modal) {
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
  }

  :deep(.jse-contextmenu) {
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    padding: 4px !important;
  }

  :deep(.jse-contextmenu button) {
    pointer-events: auto !important;
    cursor: pointer !important;
    border-radius: 4px !important;
    padding: 8px 12px !important;
    transition: all 0.2s ease !important;

    &:hover {
      background: #f3f4f6 !important;
    }
  }

  :deep(.jse-popup button) {
    pointer-events: auto !important;
    cursor: pointer !important;
  }

  // Input fields
  :deep(input[type="text"]),
  :deep(textarea) {
    border: 1px solid #e5e7eb !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
    transition: all 0.2s ease !important;

    &:focus {
      outline: none !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
  }

  // Scrollbar styling
  :deep(*::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :deep(*::-webkit-scrollbar-track) {
    background: #f3f4f6;
    border-radius: 4px;
  }

  :deep(*::-webkit-scrollbar-thumb) {
    background: #d1d5db;
    border-radius: 4px;
    transition: background 0.2s ease;

    &:hover {
      background: #9ca3af;
    }
  }
}

// Global styles for context menus (outside component scope)
:global(.jse-contextmenu),
:global(.jse-popup),
:global(.jse-modal-overlay) {
  z-index: 99999 !important;
  pointer-events: auto !important;
}
</style>
