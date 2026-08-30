"use client";

import { useRef, useState } from "react";
import { Copy, FilePenLine, Maximize2, Minimize2, X } from "lucide-react";
import { titleCase } from "@/lib/format";
import { toVscodeFileHref } from "@/lib/local-files";
import type { ISODate, Person } from "@/types/person";
import { NextActions, PrepDisclosures } from "./ConversationPrep";
import { InteractionTimeline } from "./InteractionTimeline";
import { MarkdownContent, MarkdownSection } from "./MarkdownSection";
import { RelationshipStrength } from "./RelationshipStrength";
import { Separator } from "../ui/Separator";

interface PersonDetailProps {
  person: Person;
  people: Person[];
  currentDate: ISODate;
  detailMaxWidth?: number;
  detailWidth?: number;
  expanded?: boolean;
  onSelectPerson: (id: string) => void;
  onClose: () => void;
  onResetWidth?: () => void;
  onResize?: (width: number, options?: { persist?: boolean }) => void;
  onResizeCommit?: () => void;
  onToggleExpanded?: () => void;
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

export function PersonDetail(props: PersonDetailProps) {
  return <PersonDetailContent key={props.person.id} {...props} />;
}

function PersonDetailContent({
  person,
  people,
  currentDate,
  detailMaxWidth = 760,
  detailWidth = 368,
  expanded = false,
  onSelectPerson,
  onClose,
  onResetWidth,
  onResize,
  onResizeCommit,
  onToggleExpanded,
}: PersonDetailProps) {
  const [copyStatus, setCopyStatus] = useState("");
  const resizeStart = useRef<{ pointerId: number; width: number; x: number } | null>(null);
  const introducer = person.introducedBy ? people.find(({ id }) => id === person.introducedBy) : undefined;
  const roleAndTeam = [person.role, person.team].filter(Boolean).join(" · ");
  const interactionCount = person.interactions.length;
  const vscodeHref = toVscodeFileHref(person.sourcePath);
  const whyTheyMatter = person.sections.whyTheyMatter.trim();

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(person.sourcePath);
      setCopyStatus("Path copied.");
    } catch {
      setCopyStatus("Couldn’t copy path.");
    }
  }

  return <>
    <div
      aria-label="Resize details"
      aria-orientation="vertical"
      aria-valuemax={Math.round(detailMaxWidth)}
      aria-valuemin={368}
      aria-valuenow={Math.round(detailWidth)}
      className="person-detail__resize-handle"
      onDoubleClick={onResetWidth}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onResize?.(detailWidth + 24);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onResize?.(detailWidth - 24);
        } else if (event.key === "Home") {
          event.preventDefault();
          onResetWidth?.();
        }
      }}
      onPointerDown={(event) => {
        resizeStart.current = { pointerId: event.pointerId, width: detailWidth, x: event.clientX };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = resizeStart.current;
        if (!start || start.pointerId !== event.pointerId) return;
        onResize?.(start.width + start.x - event.clientX, { persist: false });
      }}
      onPointerUp={(event) => {
        if (resizeStart.current?.pointerId !== event.pointerId) return;
        resizeStart.current = null;
        onResizeCommit?.();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        if (!resizeStart.current) return;
        resizeStart.current = null;
        onResizeCommit?.();
      }}
      role="separator"
      tabIndex={0}
    />
    <aside aria-label={`${person.name} details`} className="person-detail">
      <div className="person-detail__inner">

      {/* Tier 1 — who this is */}
      <div className="person-detail__header">
        <div className="min-w-0">
          <h2 className="person-detail__name">{person.name}</h2>
          {roleAndTeam && <p className="person-detail__role">{roleAndTeam}</p>}
          {person.company && <p className="person-detail__company">{person.company}</p>}
        </div>
        <div className="person-detail__header-actions">
          <button
            aria-label={expanded ? "Restore details" : "Expand details"}
            className="icon-button person-detail__expand"
            onClick={onToggleExpanded}
            type="button"
          >
            {expanded
              ? <Minimize2 aria-hidden="true" className="icon" strokeWidth={1.75} />
              : <Maximize2 aria-hidden="true" className="icon" strokeWidth={1.75} />}
          </button>
          <button
            aria-label="Close details"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="icon" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {whyTheyMatter && (
        <div className="person-detail__standfirst">
          <MarkdownContent markdown={whyTheyMatter} />
        </div>
      )}

      <dl className="person-detail__facts">
        <div>
          <dt className="person-detail__fact-label">Relationship</dt>
          <dd className="person-detail__fact-value"><RelationshipStrength value={person.relationshipStrength} /></dd>
        </div>
        {person.strategicRelevance && (
          <div>
            <dt className="person-detail__fact-label">Strategic relevance</dt>
            <dd className="person-detail__fact-value">
              <span className="relevance-chip" data-relevance={person.strategicRelevance}>
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
          <dd className="person-detail__fact-value">
            {interactionCount > 0
              ? (
                <a className="text-action person-detail__fact-link" href="#interaction-history">
                  {interactionCount} {interactionCount === 1 ? "interaction" : "interactions"}
                </a>
              )
              : "None recorded"}
          </dd>
        </div>
        {person.diagnostics.map((diagnostic) => (
          <div className="person-detail__diagnostic" key={diagnostic.code}>
            <dt className="person-detail__fact-label">Check this record</dt>
            <dd className="person-detail__fact-value">{diagnostic.message}</dd>
          </div>
        ))}
      </dl>

      {introducer && (
        <p className="person-detail__introducer">
          Introduced by {" "}
          <button className="text-action" onClick={() => onSelectPerson(introducer.id)} type="button">
            {introducer.name}
          </button>
        </p>
      )}

      {/* Tier 2 — what to do next */}
      <NextActions followUp={person.sections.followUp} prep={person.conversationPrep} />

      {/* Tier 3 — what to recall */}
      <Separator className="person-detail__divider" />
      <div className="person-detail__sections person-detail__sections--recall">
        <MarkdownSection markdown={person.sections.context} quiet title="Context" />
        <PrepDisclosures prep={person.conversationPrep} />
        <InteractionTimeline currentDate={currentDate} interactions={person.interactions} />
      </div>

      <Separator className="person-detail__divider" />
      <div className="person-detail__actions">
        {vscodeHref && (
          <a className="text-action" href={vscodeHref}>
            <FilePenLine aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
            Open Markdown
          </a>
        )}
        <button className="text-action" onClick={copyPath} type="button">
          <Copy aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
          Copy path
        </button>
        <span aria-live="polite" className="person-detail__status">{copyStatus}</span>
      </div>
      <p className="person-detail__path" title={person.sourcePath}>{person.sourceRelativePath}</p>
      </div>
    </aside>
  </>;
}
