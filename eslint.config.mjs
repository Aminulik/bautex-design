import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { react: pluginReact },
    settings: {
      react: {
        version: '19.1.0',
      },
    },
  },
  pluginReact.configs.flat.recommended,

  // 👇 СЕРВЕРНЫЕ ФАЙЛЫ (папка server и, если есть, api)
  {
    files: ['server/**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.node, // все глобальные переменные Node.js
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // на сервере console.log допустим
      '@typescript-eslint/no-require-imports': 'off', // разрешаем require
    },
  },

  // 👇 ОСОБЫЙ СЛУЧАЙ: webpack.config.mjs (тоже Node.js среда)
  {
    files: ['webpack.config.mjs'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  eslintPluginPrettierRecommended,
]);
