<template>
  <div class="json-editor-wrapper" :style="wrapperStyle">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script>
// Suppress ResizeObserver errors globally
(function() {
  if (!window.resizeObserverPatched) {
    const OriginalResizeObserver = window.ResizeObserver;

    window.ResizeObserver = function(callback) {
      const wrappedCallback = function(entries, observer) {
        window.requestAnimationFrame(function() {
          try {
            callback(entries, observer);
          } catch (e) {
            // Silently catch ResizeObserver errors
          }
        });
      };
      return new OriginalResizeObserver(wrappedCallback);
    };

    window.ResizeObserver.prototype = OriginalResizeObserver.prototype;
    window.resizeObserverPatched = true;
  }

  // Also suppress the error messages
  const originalError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && typeof message === 'string' && message.indexOf('ResizeObserver') !== -1) {
      return true;
    }
    if (error && error.message && error.message.indexOf('ResizeObserver') !== -1) {
      return true;
    }
    // Suppress "Cannot read properties of undefined" errors from vanilla-jsoneditor
    if (message && typeof message === 'string' &&
        (message.indexOf('Cannot read properties of undefined') !== -1 ||
         message.indexOf("reading 'path'") !== -1)) {
      console.warn('Suppressed editor internal error:', message);
      return true;
    }
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener('error', function(event) {
    if (event.message && event.message.indexOf('ResizeObserver') !== -1) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
    // Also catch "Cannot read properties of undefined" errors
    if (event.message &&
        (event.message.indexOf('Cannot read properties of undefined') !== -1 ||
         event.message.indexOf("reading 'path'") !== -1)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
})();

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
    let syncInterval = null;

    // Internal variable to store current JSON value (output variable)
    const { value: currentValue, setValue: setCurrentValue } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'json',
      type: 'object',
      defaultValue: props.content?.initialValue || {},
    });

    // Function to sync editor value to variable
    const syncEditorValue = () => {
      if (!editor) return;

      try {
        const content = editor.get();
        if (content) {
          // Check if it has json property
          if (content.json !== undefined) {
            setCurrentValue(content.json);
          }
          // Otherwise check if content.text exists and try to parse it
          else if (content.text !== undefined && content.text) {
            try {
              const parsed = JSON.parse(content.text);
              setCurrentValue(parsed);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      } catch (error) {
        // Ignore errors during sync
      }
    };

    // Computed style for wrapper
    const wrapperStyle = computed(() => ({
      height: '100%',
      minHeight: '400px',
      width: '100%',
    }));

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
                if (!updatedContent) return;

                let newValue = null;

                // Try to get json property
                if (updatedContent.json !== undefined) {
                  newValue = updatedContent.json;
                }
                // Otherwise try to parse text property
                else if (updatedContent.text !== undefined && updatedContent.text) {
                  try {
                    newValue = JSON.parse(updatedContent.text);
                  } catch (e) {
                    // Invalid JSON, skip
                    return;
                  }
                }

                if (newValue !== null) {
                  setCurrentValue(newValue);
                  console.log('JSON Editor value changed:', newValue);
                  emit('trigger-event', {
                    name: 'change',
                    event: { value: newValue },
                  });
                }
              } catch (error) {
                // Suppress "path" related errors
                const errorMessage = error?.message || String(error);
                if (errorMessage &&
                    (errorMessage.includes('Cannot read properties of undefined') ||
                     errorMessage.includes("reading 'path'"))) {
                  // Silently ignore these internal editor errors
                  return;
                }
                console.error('Error handling change:', error);
                emit('trigger-event', {
                  name: 'error',
                  event: { error: errorMessage },
                });
              }
            },
            onError: (error) => {
              // Suppress "path" related errors from the editor
              const errorMessage = error?.message || String(error);
              if (errorMessage &&
                  (errorMessage.includes('Cannot read properties of undefined') ||
                   errorMessage.includes("reading 'path'"))) {
                // Silently ignore these internal editor errors
                return;
              }
              console.error('Editor error:', error);
              emit('trigger-event', {
                name: 'error',
                event: { error: errorMessage },
              });
            },
          },
        });

        // Set initial value in output variable
        setCurrentValue(initialContent);

        console.log('JSON Editor initialized with value:', initialContent);

        // Start polling to sync editor value to variable (every 500ms)
        syncInterval = setInterval(syncEditorValue, 500);

        // Immediately hide unwanted buttons with MutationObserver for instant hiding
        const hideUnwantedButtons = () => {
          const container = editorContainer.value;
          if (!container) return;

          // Hide three-dot menu and popup buttons
          const selectors = [
            'button[title*="menu"]',
            'button[aria-label*="menu"]',
            '.jse-menu button:last-child',
            '.jse-popup-anchor',
            'button.jse-contextmenu-anchor'
          ];

          selectors.forEach(selector => {
            const elements = container.querySelectorAll(selector);
            elements.forEach(el => {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.width = '0';
              el.style.height = '0';
            });
          });

          // Also hide by SVG circles (more icon)
          const buttons = container.querySelectorAll('.jse-menu button');
          buttons.forEach(btn => {
            const svg = btn.querySelector('svg');
            if (svg && svg.querySelectorAll('circle').length === 3) {
              btn.style.display = 'none';
            }
          });
        };

        // Run immediately
        hideUnwantedButtons();

        // Watch for DOM changes and hide buttons instantly
        const observer = new MutationObserver(hideUnwantedButtons);
        observer.observe(editorContainer.value, {
          childList: true,
          subtree: true
        });
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
      // Stop polling
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }

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
  background: #fafafa;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e8e8e8;

  .editor-container {
    width: 100%;
    height: 100%;
    min-height: 200px;
    overflow: visible;
    border-radius: 16px;
  }

  // Ultra-modern minimal styling
  :deep(.jse-main) {
    position: relative;
    overflow: visible;
    border-radius: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Arial, sans-serif;
    border: none !important;
    background: #ffffff !important;
  }

  // Menu bar - sleek and minimal
  :deep(.jse-menu) {
    background: #ffffff !important;
    border-bottom: 1px solid #f0f0f0 !important;
    padding: 10px 16px !important;
    border-radius: 16px 16px 0 0 !important;
  }

  // Hide the three-dot menu button - immediate hiding
  :deep(.jse-menu button[title*="menu"]),
  :deep(.jse-menu button[class*="more"]),
  :deep(button[aria-label*="menu"]),
  :deep(.jse-menu > div:last-child > button:last-child),
  :deep(.jse-button[title="Open menu"]),
  :deep(.jse-menu button:has(svg circle)),
  :deep(.jse-menu .jse-group-button) {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  // Hide the popup/expand icon (bottom right)
  :deep(.jse-popup-anchor),
  :deep(button[title*="popup"]),
  :deep(button[title*="expand"]),
  :deep(.jse-expand-button),
  :deep(button.jse-contextmenu-anchor) {
    display: none !important;
    visibility: hidden !important;
  }

  :deep(.jse-button) {
    background: transparent !important;
    border: none !important;
    border-radius: 8px !important;
    padding: 7px 14px !important;
    color: #52525b !important;
    font-weight: 450 !important;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
    font-size: 13px !important;
    letter-spacing: -0.01em !important;

    &:hover {
      background: #f8f8f8 !important;
      color: #18181b !important;
    }

    &:active {
      background: #f0f0f0 !important;
    }
  }

  // Content area - clean white
  :deep(.jse-contents) {
    background: #ffffff !important;
    border-radius: 0 0 16px 16px !important;
  }

  // Tree view - minimal styling
  :deep(.jse-tree-mode) {
    background: #ffffff !important;
  }

  :deep(.jse-value),
  :deep(.jse-key) {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace !important;
    font-size: 13px !important;
    letter-spacing: -0.01em !important;
  }

  :deep(.jse-key) {
    color: #2563eb !important;
    font-weight: 475 !important;
  }

  :deep(.jse-value.jse-string) {
    color: #10b981 !important;
  }

  :deep(.jse-value.jse-number) {
    color: #f59e0b !important;
  }

  :deep(.jse-value.jse-boolean) {
    color: #8b5cf6 !important;
  }

  :deep(.jse-value.jse-null) {
    color: #9ca3af !important;
  }

  // Search box - minimal and clean
  :deep(.jse-search) {
    background: #fafafa !important;
    border: 1px solid #f0f0f0 !important;
    border-radius: 10px !important;
    padding: 7px 14px !important;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
    font-size: 13px !important;

    &:focus {
      outline: none !important;
      border-color: #2563eb !important;
      background: #ffffff !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08) !important;
    }
  }

  // Status bar - subtle and minimal
  :deep(.jse-status-bar) {
    background: #fafafa !important;
    border-top: 1px solid #f0f0f0 !important;
    padding: 10px 16px !important;
    color: #a1a1aa !important;
    font-size: 11px !important;
    border-radius: 0 0 16px 16px !important;
    font-weight: 450 !important;
    letter-spacing: -0.01em !important;
  }

  // Navigation bar - clean
  :deep(.jse-navigation-bar) {
    background: #ffffff !important;
    border-bottom: 1px solid #f0f0f0 !important;
    padding: 10px 16px !important;
  }

  // Modals and popups - modern and minimal
  :deep(.jse-modal),
  :deep(.jse-contextmenu),
  :deep(.jse-popup),
  :deep(.jse-modal-overlay) {
    z-index: 9999 !important;
    pointer-events: auto !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1) !important;
  }

  :deep(.jse-modal-overlay) {
    background: rgba(0, 0, 0, 0.3) !important;
    backdrop-filter: blur(8px);
  }

  :deep(.jse-modal) {
    background: #ffffff !important;
    border: 1px solid #f0f0f0 !important;
  }

  :deep(.jse-contextmenu) {
    background: #ffffff !important;
    border: 1px solid #f0f0f0 !important;
    padding: 6px !important;
  }

  :deep(.jse-contextmenu button) {
    pointer-events: auto !important;
    cursor: pointer !important;
    border-radius: 6px !important;
    padding: 8px 14px !important;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
    font-weight: 450 !important;
    font-size: 13px !important;

    &:hover {
      background: #f8f8f8 !important;
    }
  }

  :deep(.jse-popup button) {
    pointer-events: auto !important;
    cursor: pointer !important;
  }

  // Input fields - clean and modern
  :deep(input[type="text"]),
  :deep(textarea) {
    border: 1px solid #f0f0f0 !important;
    border-radius: 10px !important;
    padding: 9px 14px !important;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace !important;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
    font-size: 13px !important;
    background: #fafafa !important;

    &:focus {
      outline: none !important;
      border-color: #2563eb !important;
      background: #ffffff !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08) !important;
    }
  }

  // Minimal scrollbar styling
  :deep(*::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }

  :deep(*::-webkit-scrollbar-track) {
    background: transparent;
  }

  :deep(*::-webkit-scrollbar-thumb) {
    background: #e5e5e5;
    border-radius: 10px;
    transition: background 0.15s ease;

    &:hover {
      background: #d4d4d4;
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
