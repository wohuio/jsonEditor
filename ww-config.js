export default {
  editor: {
    label: {
      en: "JSON Editor",
    },
  },
  properties: {
    initialValue: {
      label: {
        en: "Initial JSON Value",
      },
      type: "Info",
      section: "settings",
      bindable: true,
      defaultValue: { name: "Example", value: 123, active: true },
      /* wwEditor:start */
      bindingValidation: {
        type: "object",
        tooltip: "Initial JSON object to edit",
      },
      propertyHelp: "The initial JSON data to display in the editor",
      /* wwEditor:end */
    },
    mode: {
      label: {
        en: "Editor Mode",
      },
      type: "TextSelect",
      section: "settings",
      options: {
        options: [
          { value: "tree", label: "Tree View" },
          { value: "code", label: "Code View" },
          { value: "form", label: "Form View" },
          { value: "text", label: "Text View" },
          { value: "view", label: "View Only" },
        ],
      },
      defaultValue: "tree",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Valid values: tree | code | form | text | view",
      },
      /* wwEditor:end */
    },
    mainMenuBar: {
      label: {
        en: "Show Main Menu",
      },
      type: "OnOff",
      section: "settings",
      defaultValue: true,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Show/hide the main menu bar",
      },
      /* wwEditor:end */
    },
    navigationBar: {
      label: {
        en: "Show Navigation Bar",
      },
      type: "OnOff",
      section: "settings",
      defaultValue: true,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Show/hide the navigation bar",
      },
      /* wwEditor:end */
    },
    statusBar: {
      label: {
        en: "Show Status Bar",
      },
      type: "OnOff",
      section: "settings",
      defaultValue: true,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Show/hide the status bar",
      },
      /* wwEditor:end */
    },
    readOnly: {
      label: {
        en: "Read Only",
      },
      type: "OnOff",
      section: "settings",
      defaultValue: false,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Make the editor read-only",
      },
      /* wwEditor:end */
    },
    indentation: {
      label: {
        en: "Indentation",
      },
      type: "Number",
      section: "settings",
      min: 2,
      max: 8,
      step: 1,
      defaultValue: 2,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "number",
        tooltip: "Number of spaces for indentation",
      },
      /* wwEditor:end */
    },
    height: {
      label: {
        en: "Editor Height",
      },
      type: "Length",
      section: "style",
      defaultValue: "400px",
      bindable: true,
    },
  },
  triggerEvents: [
    {
      name: "change",
      label: { en: "On value change" },
      event: {
        value: {},
      },
    },
    {
      name: "error",
      label: { en: "On error" },
      event: {
        error: "",
      },
    },
  ],
};
