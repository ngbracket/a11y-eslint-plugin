import { RuleTester } from 'eslint';
import * as templateParser from '@angular-eslint/template-parser';
import { afterAll, describe, it } from 'vitest';
import { accessibleName } from '../src/rules/accessible-name';

// Wire ESLint's RuleTester into vitest's lifecycle.
// `afterAll` is a RuleTester hook its type definitions leave out.
(RuleTester as unknown as { afterAll: typeof afterAll }).afterAll = afterAll;
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
    // text and interpolation inside child elements name the button
    { code: '<app-button><span>Save</span></app-button>', options },
    { code: '<app-button><span><b>{{ label }}</b></span></app-button>', options },
    { code: '<app-button><ng-container>Save</ng-container></app-button>', options },
    { code: '<app-button><mat-icon aria-hidden="true">delete</mat-icon> Delete</app-button>', options },
    // a child's aria-label or an image's alt is part of the name
    { code: '<app-button><span aria-label="Close"></span></app-button>', options },
    { code: '<app-button><img src="x.svg" alt="Close"></app-button>', options },
    { code: '<app-button><img src="x.svg" [alt]="label"></app-button>', options },
    // a mat-icon the template explicitly exposes
    { code: '<app-button><mat-icon aria-hidden="false">delete</mat-icon></app-button>', options },
    // control flow: any branch with content counts
    { code: '<app-button>@if (busy) { Saving } @else { <span>Save</span> }</app-button>', options },
    { code: '<app-button>@for (p of parts; track p) { {{ p }} }</app-button>', options },
    { code: '<app-button>@switch (s) { @case (1) { One } }</app-button>', options },
    { code: '<app-button>@defer { Save } @placeholder { <span>Save</span> }</app-button>', options },
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
    // content hidden from assistive technology doesn't name it
    {
      code: '<app-button><span aria-hidden="true">x</span></app-button>',
      options,
      errors: [{ messageId: 'missingName' }],
    },
    { code: '<app-button><span hidden>Save</span></app-button>', options, errors: [{ messageId: 'missingName' }] },
    // Material sets aria-hidden="true" on mat-icon by default
    { code: '<app-button><mat-icon>delete</mat-icon></app-button>', options, errors: [{ messageId: 'missingName' }] },
    // an image with no alt, or an empty one
    { code: '<app-button><img src="x.svg"></app-button>', options, errors: [{ messageId: 'missingName' }] },
    { code: '<app-button><img src="x.svg" alt=""></app-button>', options, errors: [{ messageId: 'missingName' }] },
    // ng-template content isn't rendered in place
    {
      code: '<app-button><ng-template>Save</ng-template></app-button>',
      options,
      errors: [{ messageId: 'missingName' }],
    },
    // whitespace-only content in nested elements and blocks
    {
      code: '<app-button> <span> </span> @if (a) { } </app-button>',
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
