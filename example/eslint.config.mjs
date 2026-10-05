import templateParser from '@angular-eslint/template-parser';
import a11y from '../dist/index.js';

export default [
  {
    files: ['**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { '@ngbracket/a11y': a11y },
    settings: {
      '@ngbracket/a11y': {
        components: { 'app-button': 'button', 'app-link': 'a', 'app-modal': 'dialog' },
      },
    },
    ...a11y.configs.recommended.rules ? { rules: a11y.configs.recommended.rules } : {},
  },
];
