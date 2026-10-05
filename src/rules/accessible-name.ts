import { ESLintUtils } from '@typescript-eslint/utils';
import { hasAccessibleName, resolveComponentMap, type TmplElement } from '../ast';

/** Native elements that require an accessible name to be usable. */
const REQUIRES_NAME = new Set(['button', 'a']);

export type Options = [{ components?: Record<string, string> }?];
export type MessageIds = 'missingName';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ngbracket/a11y-eslint-plugin#${name}`,
);

export const accessibleName = createRule<Options, MessageIds>({
  name: 'accessible-name',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Custom components mapped to a native element that requires an accessible name must have one.',
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
        '<{{tag}}> maps to <{{element}}>, which requires an accessible name, but none was found. Add text content, aria-label, or aria-labelledby.',
    },
  },
  defaultOptions: [{}],
  create(context) {
    const components = resolveComponentMap(context);

    function check(node: TmplElement): void {
      const mapped = components[node.name];
      if (!mapped || !REQUIRES_NAME.has(mapped)) return;
      if (hasAccessibleName(node)) return;
      context.report({
        node: node as never,
        messageId: 'missingName',
        data: { tag: node.name, element: mapped },
      });
    }

    // `Element` is a template-AST selector, not an ESTree node, so the listener
    // is widened past the typed RuleListener.
    return {
      Element: (node: unknown) => check(node as TmplElement),
    } as Record<string, (node: unknown) => void>;
  },
});
