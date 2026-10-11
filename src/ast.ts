import type { TSESLint } from '@typescript-eslint/utils';

/**
 * Minimal structural types for the Angular template AST nodes this plugin reads.
 *
 * MVP note: kept local rather than importing Angular's compiler AST types, to
 * avoid coupling the build to a specific compiler-types export. Shapes checked
 * against `@angular-eslint/template-parser`: elements are `type: 'Element'` with a
 * kebab-case `name`, static attrs in `attributes`, bindings in `inputs`, and
 * interpolation content as `BoundText` children.
 */
export interface TmplTextAttribute {
  name: string;
  value: string;
}

export interface TmplBoundAttribute {
  name: string;
}

export interface TmplChild {
  type?: string;
  value?: unknown;
}

export interface TmplElement {
  type: 'Element';
  name: string;
  attributes?: TmplTextAttribute[];
  inputs?: TmplBoundAttribute[];
  children?: TmplChild[];
}

const NAME_ATTRS = new Set(['aria-label', 'aria-labelledby', 'title']);
const LABEL_ATTRS = new Set(['aria-label', 'aria-labelledby']);

/** Value of a static text attribute, or `undefined` if absent. */
export function getStaticAttr(node: TmplElement, name: string): string | undefined {
  return node.attributes?.find((a) => a.name === name)?.value;
}

/**
 * Does this element carry an ARIA label reference (`aria-label` /
 * `aria-labelledby`), static or bound? Unlike `hasAccessibleName`, text content
 * does not count — a container like a dialog is named by its label, not its
 * contents.
 */
export function hasAriaLabel(node: TmplElement): boolean {
  for (const attr of node.attributes ?? []) {
    if (LABEL_ATTRS.has(attr.name) && String(attr.value).trim() !== '') return true;
  }
  for (const input of node.inputs ?? []) {
    if (LABEL_ATTRS.has(input.name.replace(/^attr\./, ''))) return true;
  }
  return false;
}

/** Does this element carry something that yields an accessible name? */
export function hasAccessibleName(node: TmplElement): boolean {
  // Static text attributes: aria-label="Save", aria-labelledby="id", title="..".
  for (const attr of node.attributes ?? []) {
    if (NAME_ATTRS.has(attr.name) && String(attr.value).trim() !== '') return true;
  }
  // Bound inputs: [attr.aria-label]="..", [aria-label]="..", etc.
  for (const input of node.inputs ?? []) {
    const name = input.name.replace(/^attr\./, '');
    if (NAME_ATTRS.has(name)) return true;
  }
  if (hasBoundContent(node)) return true;
  return hasNameFromContent(node.children ?? []);
}

/**
 * Do these template nodes give their parent a name from content? Text and
 * interpolation count at any depth, as do a descendant's `aria-label`,
 * `aria-labelledby` or an `<img>`'s `alt`. Content hidden from assistive
 * technology doesn't: elements with a static `aria-hidden="true"` or `hidden`,
 * and `<mat-icon>` (Angular Material sets `aria-hidden="true"` on it unless the
 * template says `aria-hidden="false"`). `@if`/`@for`/`@switch`/`@defer` branches
 * are searched; any branch with content counts, and so does an element with a
 * structural directive (`*ngIf`). A bare `<ng-template>` isn't rendered in
 * place, so it's skipped; one with a directive (`[ngIf]`) is searched.
 * Projected content (`<ng-content>`) and bound `innerHTML`/`textContent` can't
 * be seen, so like other bindings they're assumed to give a name.
 */
function hasNameFromContent(children: readonly TmplChild[]): boolean {
  for (const child of children) {
    const type = child.type ?? '';
    if (type.startsWith('BoundText')) return true;
    if (type.startsWith('Text')) {
      if (String(child.value ?? '').trim() !== '') return true;
      continue;
    }
    if (type.startsWith('Element')) {
      const el = child as TmplElement;
      if (isHiddenFromAt(el)) continue;
      if (hasAriaLabel(el)) return true;
      if (el.name === 'img' && hasAlt(el)) return true;
      if (hasBoundContent(el)) return true;
      if (hasNameFromContent(el.children ?? [])) return true;
      continue;
    }
    if (type.startsWith('Content')) return true;
    if (type.startsWith('Template')) {
      const tmpl = child as TmplChild & { tagName?: string; inputs?: TmplBoundAttribute[]; children?: TmplChild[] };
      // A bare <ng-template> renders only where something stamps it out.
      if (tmpl.tagName === 'ng-template' && !(tmpl.inputs ?? []).length) continue;
      if (hasNameFromContent(tmpl.children ?? [])) return true;
      continue;
    }
    // Control-flow blocks and their branches, cases and placeholders.
    if (hasNameFromContent(blockChildren(child))) return true;
  }
  return false;
}

function isHiddenFromAt(el: TmplElement): boolean {
  if (getStaticAttr(el, 'hidden') !== undefined) return true;
  const ariaHidden = getStaticAttr(el, 'aria-hidden');
  if (ariaHidden === 'true') return true;
  return el.name === 'mat-icon' && ariaHidden !== 'false';
}

const CONTENT_PROPS = new Set(['innerHTML', 'textContent', 'innerText']);

/** A binding that sets the element's content, such as `[innerHTML]`. */
function hasBoundContent(el: TmplElement): boolean {
  return (el.inputs ?? []).some((input) => CONTENT_PROPS.has(input.name));
}

function hasAlt(el: TmplElement): boolean {
  const alt = getStaticAttr(el, 'alt');
  if (alt !== undefined && alt.trim() !== '') return true;
  return (el.inputs ?? []).some((input) => input.name.replace(/^attr\./, '') === 'alt');
}

/** The child nodes of a control-flow block, whichever property holds them. */
function blockChildren(node: TmplChild): TmplChild[] {
  const block = node as Record<string, unknown>;
  const out: TmplChild[] = [];
  for (const key of ['children', 'branches', 'groups', 'cases', 'empty', 'placeholder', 'loading', 'error']) {
    const value = block[key];
    if (Array.isArray(value)) out.push(...(value as TmplChild[]));
    else if (value && typeof value === 'object') out.push(value as TmplChild);
  }
  return out;
}

/**
 * The custom-component -> native-element map, keyed by the *template tag/selector*
 * (kebab-case, e.g. `app-button`), never the class name.
 *
 * Resolved from a shared setting so every rule in the plugin uses one map:
 *   settings: { '@ngbracket/a11y': { components: { 'app-button': 'button' } } }
 * A per-rule `components` option, when present, takes precedence.
 */
export function resolveComponentMap(
  context: { settings: TSESLint.SharedConfigurationSettings; options: readonly unknown[] },
): Record<string, string> {
  const setting = context.settings['@ngbracket/a11y'] as
    | { components?: Record<string, string> }
    | undefined;
  const option = context.options[0] as { components?: Record<string, string> } | undefined;
  return { ...(setting?.components ?? {}), ...(option?.components ?? {}) };
}
