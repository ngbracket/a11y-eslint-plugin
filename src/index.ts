import { accessibleName } from './rules/accessible-name';
import { overlayAccessibleName } from './rules/overlay-accessible-name';

const plugin = {
  meta: {
    name: '@ngbracket/a11y-eslint-plugin',
    version: '0.1.0',
  },
  rules: {
    'accessible-name': accessibleName,
    'overlay-accessible-name': overlayAccessibleName,
  },
  configs: {} as Record<string, unknown>,
};

// Flat-config presets. Consumers still supply the template parser + `files`
// glob for their `.html` templates (as with @angular-eslint), e.g.:
//   { files: ['**/*.html'], languageOptions: { parser: templateParser } }
Object.assign(plugin.configs, {
  recommended: {
    plugins: { '@ngbracket/a11y': plugin },
    rules: {
      '@ngbracket/a11y/accessible-name': 'error',
      '@ngbracket/a11y/overlay-accessible-name': 'error',
    },
  },
});

export = plugin;
