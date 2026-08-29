"use client";

import { useState } from "react";
import { Copy, FilePenLine, X } from "lucide-react";
import { toVscodeFileHref } from "@/lib/local-files";
import type { ISODate, Person } from "@/types/person";
import { ConversationPrepPanel } from "./ConversationPrep";
import { MarkdownSection } from "./MarkdownSection";
import { RelationshipStrength } from "./RelationshipStrength";
import { Separator } from "../ui/Separator";

interface PersonDetailProps {
  person: Person;
  people: Person[];
  onSelectPerson: (id: string) => void;
  onClose: () => void;
}

function formatDate(date: ISODate): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function titleCase(value?: string): string | undefined {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : undefined;
}

export function PersonDetail(props: PersonDetailProps) {
  return <PersonDetailContent key={props.person.id} {...props} />;
}

function PersonDetailContent({ person, people, onSelectPerson, onClose }: PersonDetailProps) {
  const [copyStatus, setCopyStatus] = useState("");
  const introducer = person.introducedBy ? people.find(({ id }) => id === person.introducedBy) : undefined;
  const roleAndTeam = [person.role, person.team].filter(Boolean).join(" · ");
  const interactionCount = person.interactions.length;
  const latestInteraction = person.interactions[0];

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(person.sourcePath);
      setCopyStatus("Path copied.");
    } catch {
      setCopyStatus("Couldn’t copy path.");
    }
  }

  return (
    <aside aria-label={`${person.name} details`} className="person-detail">
      <div className="person-detail__inner">
      <div className="person-detail__header">
        <div className="min-w-0">
          <h2 className="person-detail__name">{person.name}</h2>
          {roleAndTeam && <p className="person-detail__role">{roleAndTeam}</p>}
          {person.company && <p className="person-detail__company">{person.company}</p>}
        </div>
        <button
          aria-label="Close details"
          className="icon-button"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      <dl className="person-detail__facts">
        <div>
          <dt className="person-detail__fact-label">Relationship</dt>
          <dd className="person-detail__fact-value"><RelationshipStrength value={person.relationshipStrength} /></dd>
        </div>
        {person.strategicRelevance && (
          <div>
            <dt className="person-detail__fact-label">Strategic relevance</dt>
            <dd className="person-detail__fact-value">
              <span className="relevance-value" data-relevance={person.strategicRelevance}>
                {titleCase(person.strategicRelevance)}
              </span>
            </dd>
          </div>
        )}
        {person.effectiveLastContact && (
          <div>
            <dt className="person-detail__fact-label">Last contact</dt>
            <dd className="person-detail__fact-value">{formatDate(person.effectiveLastContact)}</dd>
          </div>
        )}
        <div>
          <dt className="person-detail__fact-label">Interactions</dt>
          <dd className="person-detail__fact-value">{interactionCount} {interactionCount === 1 ? "interaction" : "interactions"}</dd>
        </div>
      </dl>

      {introducer && (
        <p className="person-detail__introducer">
          Introduced by {" "}
          <button className="text-action" onClick={() => onSelectPerson(introducer.id)} type="button">
            {introducer.name}
          </button>
        </p>
      )}

      <Separator className="person-detail__divider" />
      <div className="person-detail__sections">
        <MarkdownSection markdown={person.sections.whyTheyMatter} title="Why they matter" />
        <MarkdownSection markdown={person.sections.context} title="Context" />
        <ConversationPrepPanel prep={person.conversationPrep} />
        {latestInteraction && (
          <section aria-labelledby="latest-interaction-heading" className="detail-section">
            <h3 className="detail-section__heading" id="latest-interaction-heading">Latest interaction</h3>
            <p className="person-detail__latest-kind">{latestInteraction.kind}</p>
            <p className="person-detail__date">{formatDate(latestInteraction.date)}</p>
            <MarkdownSection markdown={latestInteraction.markdown} title="Conversation notes" />
          </section>
        )}
        <MarkdownSection markdown={person.sections.followUp} title="Follow-up" />
      </div>

      <Separator className="person-detail__divider" />
      <div className="person-detail__actions">
        <a className="text-action" href={toVscodeFileHref(person.sourcePath)}>
          <FilePenLine aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          Open Markdown
        </a>
        <button className="text-action" onClick={copyPath} type="button">
          <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          Copy path
        </button>
        <span aria-live="polite" className="person-detail__status">{copyStatus}</span>
      </div>
      <p className="person-detail__path" title={person.sourcePath}>{person.sourceRelativePath}</p>
      </div>
    </aside>
  );
}
