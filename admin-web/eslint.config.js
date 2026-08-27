import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      boundaries,
      import: importPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.json'],
        },
      },
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        { type: 'pages', pattern: 'src/pages/**' },
        { type: 'features', pattern: 'src/features/**' },
        { type: 'entities', pattern: 'src/entities/**' },
        { type: 'shared', pattern: 'src/shared/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '"${file.type}" не может импортировать "${dependency.type}"',
          rules: [
            { from: 'app', allow: ['pages', 'features', 'entities', 'shared'] },
            { from: 'pages', allow: ['features', 'entities', 'shared'] },
            { from: 'features', allow: ['entities', 'shared'] },
            { from: 'entities', allow: ['shared'] },
            { from: 'shared', allow: [] },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',
    },
  },
);
