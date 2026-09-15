import * as chrono from 'chrono-node';

export interface QuickAddResult {
  /** What's left of the input after stripping the recognized date/time and #tag. */
  title: string;
  start: Date | null;
  end: Date | null;
  /** True when a specific time of day was mentioned (vs. just a date) — Todoist-style quick-add convention. */
  hasTime: boolean;
  /** From a "#tag" anywhere in the input, e.g. "#Produce" — used as a Task's Category. */
  category: string | null;
}

/**
 * Parses Todoist-style quick-add text: a title plus an optional natural-language
 * date/time ("tomorrow 5pm", "next Monday") and an optional "#tag" for Category.
 * Both are stripped from the returned title. Client-side only — the backend still
 * just sees a plain title + ISO date, same as the full forms.
 */
export function parseQuickAdd(input: string): QuickAddResult {
  let text = input;
  let category: string | null = null;

  const tagMatch = text.match(/#(\S+)/);
  if (tagMatch && tagMatch.index !== undefined) {
    category = tagMatch[1];
    text = (text.slice(0, tagMatch.index) + text.slice(tagMatch.index + tagMatch[0].length)).trim();
  }

  const results = chrono.parse(text, new Date(), { forwardDate: true });
  let start: Date | null = null;
  let end: Date | null = null;
  let hasTime = false;

  if (results.length > 0) {
    const result = results[0];
    start = result.start.date();
    end = result.end ? result.end.date() : null;
    hasTime = result.start.isCertain('hour');
    text = (text.slice(0, result.index) + text.slice(result.index + result.text.length)).trim();
  }

  const title = text.replace(/\s{2,}/g, ' ').trim();
  return { title, start, end, hasTime, category };
}
