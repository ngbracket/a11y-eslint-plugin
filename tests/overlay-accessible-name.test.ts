import { RuleTester } from 'eslint';
import * as templateParser from '@angular-eslint/template-parser';
import { afterAll, describe, it } from 'vitest';
import { overlayAccessibleName } from '../src/rules/overlay-accessible-name';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { parser: templateParser as unknown as object },
});

// Custom overlay component mapped to `dialog`, keyed by kebab-case tag.
const options = [{ components: { 'app-modal': 'dialog' } }] as const;

ruleTester.run('overlay-accessible-name', overlayAccessibleName as never, {
  valid: [
    // role="dialog" with a label
    { code: '<div role="dialog" aria-label="Settings"></div>' },
    { code: '<div role="alertdialog" aria-labelledby="t"><h2 id="t">Warning</h2></div>' },
    // bound label
    { code: '<div role="dialog" [attr.aria-labelledby]="titleId"></div>' },
    // native <dialog> with a label
    { code: '<dialog aria-label="Profile"></dialog>' },
    // mapped custom overlay with a label
    { code: '<app-modal aria-label="Filters"></app-modal>', options },
    // not a dialog at all
    { code: '<div></div>' },
    // unmapped custom component ignored
    { code: '<app-modal></app-modal>' },
  ],
  invalid: [
    {
      code: '<div role="dialog"></div>',
      errors: [{ messageId: 'missingName' }],
    },
    {
      code: '<div role="alertdialog"></div>',
      errors: [{ messageId: 'missingName' }],
    },
    // text content is NOT an accessible name for a dialog container
    {
      code: '<div role="dialog"><h2>Settings</h2></div>',
      errors: [{ messageId: 'missingName' }],
    },
    {
      code: '<dialog></dialog>',
      errors: [{ messageId: 'missingName' }],
    },
    {
      code: '<app-modal></app-modal>',
      options,
      errors: [{ messageId: 'missingName' }],
    },
  ],
});
