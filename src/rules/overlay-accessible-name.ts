import { ESLintUtils } from '@typescript-eslint/utils';
import {
  getStaticAttr,
  hasAriaLabel,
  resolveComponentMap,
  type TmplElement,
} from '../ast';

/** ARIA roles that denote a dialog/overlay requiring an accessible name. */
const DIALOG_ROLES = new Set(['dialog', 'alertdialog']);

export type Options = [{ components?: Record<string, string> }?];
export type MessageIds = 'missingName';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://ngbracket.com/tools/a11y-eslint-plugin/docs/${name}`,
);

export const overlayAccessibleName = createRule<Options, MessageIds>({
  name: 'overlay-accessible-name',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Dialogs and overlays must have an accessible name via aria-label or aria-labelledby.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          components: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingName:
        'This {{kind}} has no accessible name. Add aria-label, or aria-labelledby referencing its title element.',
    },
  },
  defaultOptions: [{}],
  create(context) {
    const components = resolveComponentMap(context);

    function check(node: TmplElement): void {
      // A dialog/overlay is: an explicit dialog role, the native <dialog>
      // element, or a custom component mapped to `dialog`.
      const role = getStaticAttr(node, 'role');
      const isRoleDialog = role !== undefined && DIALOG_ROLES.has(role);
      const isNativeDialog = node.name === 'dialog';
      const isMappedDialog = components[node.name] === 'dialog';
      if (!isRoleDialog && !isNativeDialog && !isMappedDialog) return;

      if (hasAriaLabel(node)) return;

      const kind = isRoleDialog ? `[role="${role}"]` : `<${node.name}>`;
      context.report({
        node: node as never,
        messageId: 'missingName',
        data: { kind },
      });
    }

    return {
      Element: (node: unknown) => check(node as TmplElement),
    } as Record<string, (node: unknown) => void>;
  },
});
