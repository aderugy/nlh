/**
 * Shape of `ranges/ranges.json` and the indexing on top of it.
 *
 * Walk by `type`, never by depth: a spot sits at depth 2 in some groups and
 * depth 3 in others (see CLAUDE.md).
 */

/** Folder. */
export const NODE_FOLDER = 0;
/** A spot — the thing the trainer quizzes. */
export const NODE_SPOT = 1;
/** One action inside a spot. */
export const NODE_ACTION = 2;

export interface RangeNode {
  name: string;
  path: string[];
  order: number;
  expanded: boolean;
  type: number;
  color: number;
  children?: RangeNode[];
  range?: string;
  /** Editor rendering state, redundant with `range`. Ignored. */
  marked_cells?: unknown[];
  palette?: number[];
}

/**
 * One selectable range: a spot that carries `range` directly, or one action
 * node inside a spot. The id is the node's path minus the root, which is stable
 * across re-exports.
 */
export interface RangeEntry {
  id: string;
  /** Leaf name, e.g. `"BB vs CO"` — the user's own label, untranslated. */
  name: string;
  /** Top-level group, e.g. `"Mes Ranges NL 10-"`. */
  group: string;
  /** Folders between the group and the leaf, e.g. `"3bet"`. */
  breadcrumb: string;
  /** Action name when the range came from a `type: 2` child, else null. */
  action: string | null;
  /** Raw notation, parsed lazily by {@link parseRange}. */
  range: string;
}

/**
 * Groups holding the user's own ranges. These are the only valid answer keys
 * for the range quiz; the equity quiz offers every group in both selectors.
 */
export const HERO_GROUPS: readonly string[] = ["Mes Ranges NL 10-", "Mes ranges NL 25 - 50"];

export function isHeroGroup(group: string): boolean {
  return HERO_GROUPS.includes(group);
}

function spotId(path: readonly string[]): string {
  return path.slice(1).join("/");
}

/**
 * Flatten the tree into every selectable range, in tree order.
 *
 * A spot either carries `range` itself or has `type: 2` action children that
 * each carry one; both shapes appear in the export.
 */
export function collectRanges(root: RangeNode): RangeEntry[] {
  const out: RangeEntry[] = [];

  const visit = (node: RangeNode): void => {
    const children = node.children ?? [];

    if (node.type === NODE_SPOT) {
      const group = node.path[1] ?? node.name;
      const breadcrumb = node.path.slice(2, -1).join(" / ");
      const actions = children.filter((c) => c.type === NODE_ACTION && c.range);

      if (actions.length > 0) {
        for (const action of actions) {
          out.push({
            id: spotId(action.path),
            name: node.name,
            group,
            breadcrumb,
            action: action.name,
            range: action.range ?? "",
          });
        }
      } else if (node.range) {
        out.push({
          id: spotId(node.path),
          name: node.name,
          group,
          breadcrumb,
          action: null,
          range: node.range,
        });
      }
      // A spot with neither is an empty editor node; nothing to quiz.
      return;
    }

    for (const child of children) visit(child);
  };

  visit(root);
  return out;
}

/** Group entries by their top-level group, preserving tree order. */
export function groupEntries(entries: readonly RangeEntry[]): { group: string; entries: RangeEntry[] }[] {
  const byGroup = new Map<string, RangeEntry[]>();
  for (const entry of entries) {
    const bucket = byGroup.get(entry.group);
    if (bucket) bucket.push(entry);
    else byGroup.set(entry.group, [entry]);
  }
  return [...byGroup].map(([group, groupedEntries]) => ({ group, entries: groupedEntries }));
}

/** Full label for a range, used in pickers and answer panels. */
export function entryLabel(entry: RangeEntry): string {
  const parts = [entry.breadcrumb, entry.name].filter(Boolean);
  return parts.join(" / ");
}
