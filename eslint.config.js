// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tailwindcss from 'eslint-plugin-tailwindcss';

export default [js.configs.recommended, {
  files: ['frontend/src/**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: {
      // Browser globals
      window: 'readonly',
      document: 'readonly',
      console: 'readonly',
      localStorage: 'readonly',
      sessionStorage: 'readonly',
      fetch: 'readonly',
      URL: 'readonly',
      performance: 'readonly',
      requestAnimationFrame: 'readonly',
      cancelAnimationFrame: 'readonly',
      alert: 'readonly',
      confirm: 'readonly',
      // Node globals
      process: 'readonly',
      module: 'readonly',
      require: 'readonly',
      __dirname: 'readonly',
    },
  },
  plugins: {
    react,
    'react-hooks': reactHooks,
    tailwindcss,
  },
  settings: {
    react: {
      version: 'detect',
    },
    tailwindcss: {
      config: './tailwind.config.js',
    },
  },
  rules: {
    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    ...reactHooks.configs.recommended.rules,

    // Tailwind - カスタムクラス名の順序強制
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/enforces-shorthand': 'warn',
    'tailwindcss/no-custom-classname': 'off',

    // 禁止パターン: デフォルトTailwind色
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/bg-gray-|text-gray-|border-gray-|bg-blue-[0-9]|bg-red-[0-9]/]',
        message: 'デフォルトTailwind色は禁止です。surface-*, ink-*, accent-* を使用してください。',
      },
    ],

    // lucide直接importを禁止
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'lucide-react',
            message: 'lucide-reactからの直接importは禁止です。components/Icons からimportしてください。',
          },
        ],
      },
    ],
  },
}, {
  ignores: ['node_modules/', 'dist/', 'build/', '*.config.js', 'frontend/src/main.cjs'],
}, ...storybook.configs["flat/recommended"]];
