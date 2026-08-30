"use client";

import { calendarDaysBetween, describeElapsedDays } from "@/lib/dates";
import type { ISODate, Interaction } from "@/types/person";
import { MarkdownContent } from "./MarkdownSection";

interface InteractionTimelineProps {
  interactions: Interaction[];
  currentDate: ISODate;
}

function formatDate(date: ISODate): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function elapsedLabel(date: ISODate, currentDate: ISODate): string {
  try {
    return describeElapsedDays(calendarDaysBetween(date, currentDate));
  } catch {
    return "";
  }
}

export function InteractionTimeline({ interactions, currentDate }: InteractionTimelineProps) {
  if (interactions.length === 0) {
    return (
      <section aria-labelledby="interaction-timeline-heading" className="detail-section">
        <h3 className="detail-section__heading detail-section__heading--quiet" id="interaction-timeline-heading">
          History
        </h3>
        <p className="timeline__empty">
          No interactions recorded yet. Add a dated <code className="detail-code">### Interactions</code> entry
          to the Markdown file to start the history.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="interaction-timeline-heading" className="detail-section" id="interaction-history">
      <h3 className="detail-section__heading detail-section__heading--quiet" id="interaction-timeline-heading">
        History
        <span className="detail-section__count tabular">{interactions.length}</span>
      </h3>
      <ol className="timeline">
        {interactions.map((interaction, index) => (
          <li className="timeline__entry" key={`${interaction.date}-${index}`}>
            <details className="timeline__disclosure" open={index === 0}>
              <summary className="timeline__summary">
                <span className="timeline__kind">{interaction.kind}</span>
                <span className="timeline__date tabular">
                  <time dateTime={interaction.date}>{formatDate(interaction.date)}</time>
                  <span className="timeline__elapsed">{elapsedLabel(interaction.date, currentDate)}</span>
                </span>
              </summary>
              <div className="timeline__body">
                {interaction.markdown.trim()
                  ? <MarkdownContent markdown={interaction.markdown} />
                  : <p className="timeline__empty">No notes recorded.</p>}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
