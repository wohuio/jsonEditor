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

    // Internal variable to store current JSON value
    const { value: currentValue, setValue: setCurrentValue } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'value',
      type: 'object',
      defaultValue: {},
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

        // Set initial value in internal variable
        setCurrentValue(initialContent);

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

  .editor-container {
    width: 100%;
    height: 100%;
    min-height: 200px;
    overflow: visible;
  }

  // Ensure popups and menus can appear above other elements
  :deep(.jse-modal),
  :deep(.jse-contextmenu),
  :deep(.jse-popup),
  :deep(.jse-modal-overlay) {
    z-index: 9999 !important;
    pointer-events: auto !important;
  }

  // Fix for menu positioning
  :deep(.jse-main) {
    position: relative;
    overflow: visible;
  }

  // Ensure menu buttons work
  :deep(.jse-contextmenu button),
  :deep(.jse-popup button) {
    pointer-events: auto !important;
    cursor: pointer;
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
