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
  // Non-whitespace text content, or any interpolation (assumed to name it).
  for (const child of node.children ?? []) {
    const type = child.type ?? '';
    if (type.startsWith('BoundText')) return true;
    if (type.startsWith('Text') && String(child.value ?? '').trim() !== '') return true;
  }
  return false;
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
