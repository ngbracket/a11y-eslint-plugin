import { RuleTester } from 'eslint';
import * as templateParser from '@angular-eslint/template-parser';
import { afterAll, describe, it } from 'vitest';
import { accessibleName } from '../src/rules/accessible-name';

// Wire ESLint's RuleTester into vitest's lifecycle.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { parser: templateParser as unknown as object },
});

// Mapping is keyed by the template tag/selector (kebab-case), not the class name.
const options = [{ components: { 'app-button': 'button', 'app-link': 'a' } }] as const;

ruleTester.run('accessible-name', accessibleName as never, {
  valid: [
    { code: '<app-button>Save</app-button>', options },
    { code: '<app-button aria-label="Save"></app-button>', options },
    { code: '<app-button [attr.aria-label]="label"></app-button>', options },
    { code: '<app-button>{{ label }}</app-button>', options },
    // mapped to a native element that does not require a name
    { code: '<app-box></app-box>', options: [{ components: { 'app-box': 'div' } }] },
    // unmapped custom component is ignored
    { code: '<app-widget></app-widget>', options },
    // native button untouched (rule only fires on mapped custom tags)
    { code: '<button></button>', options },
    // component map supplied via shared settings instead of options
    {
      code: '<app-button></app-button>',
      settings: { '@ngbracket/a11y': { components: { 'app-button': 'div' } } },
    },
  ],
  invalid: [
    { code: '<app-button></app-button>', options, errors: [{ messageId: 'missingName' }] },
    { code: '<app-link href="/x"></app-link>', options, errors: [{ messageId: 'missingName' }] },
    {
      code: '<app-button aria-label="  "></app-button>',
      options,
      errors: [{ messageId: 'missingName' }],
    },
    // map from shared settings, no accessible name
    {
      code: '<app-button></app-button>',
      settings: { '@ngbracket/a11y': { components: { 'app-button': 'button' } } },
      errors: [{ messageId: 'missingName' }],
    },
  ],
});
