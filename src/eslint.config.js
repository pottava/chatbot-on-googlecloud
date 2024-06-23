import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        __dirname: "readonly",
      },
    },
  },
  pluginJs.configs.recommended,
];
