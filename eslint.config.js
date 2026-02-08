const globals = require('globals');
const pluginJs = require('@eslint/js');

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2021,
      sourceType: 'commonjs'

    },
    rules: {
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single', { 'avoidEscape': true }]
    }
  },
  pluginJs.configs.recommended,
];
