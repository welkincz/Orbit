"use client";

import { useState } from "react";
import { toVscodeFileHref } from "@/lib/local-files";
import type { ISODate, Person } from "@/types/person";
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
    <aside aria-label={`${person.name} details`} className="w-full rounded-lg border border-slate-200 bg-white p-5 md:w-96">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">{person.name}</h2>
          {roleAndTeam && <p className="mt-1 text-sm text-slate-600">{roleAndTeam}</p>}
          {person.company && <p className="mt-1 text-sm text-slate-600">{person.company}</p>}
        </div>
        <button
          aria-label="Close details"
          className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Relationship</dt>
          <dd className="mt-1"><RelationshipStrength value={person.relationshipStrength} /></dd>
        </div>
        {person.strategicRelevance && (
          <div>
            <dt className="text-slate-500">Strategic relevance</dt>
            <dd className="mt-1 font-medium text-slate-900">{titleCase(person.strategicRelevance)}</dd>
          </div>
        )}
        {person.effectiveLastContact && (
          <div>
            <dt className="text-slate-500">Last contact</dt>
            <dd className="mt-1 text-slate-900">{formatDate(person.effectiveLastContact)}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-500">Interactions</dt>
          <dd className="mt-1 text-slate-900">{interactionCount} {interactionCount === 1 ? "interaction" : "interactions"}</dd>
        </div>
      </dl>

      {introducer && (
        <p className="mt-4 text-sm text-slate-600">
          Introduced by {" "}
          <button className="font-medium text-slate-900 underline underline-offset-2" onClick={() => onSelectPerson(introducer.id)} type="button">
            {introducer.name}
          </button>
        </p>
      )}

      <Separator className="my-5" />
      <div className="space-y-5">
        <MarkdownSection markdown={person.sections.whyTheyMatter} title="Why they matter" />
        <MarkdownSection markdown={person.sections.context} title="Context" />
        {latestInteraction && (
          <section aria-labelledby="latest-interaction-heading" className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-950" id="latest-interaction-heading">Latest interaction</h3>
            <p className="text-sm font-medium text-slate-900">{latestInteraction.kind}</p>
            <p className="text-xs text-slate-500">{formatDate(latestInteraction.date)}</p>
            <MarkdownSection markdown={latestInteraction.markdown} title="Conversation notes" />
          </section>
        )}
        <MarkdownSection markdown={person.sections.followUp} title="Follow-up" />
      </div>

      <Separator className="my-5" />
      <div className="flex flex-wrap items-center gap-3">
        <a className="text-sm font-medium text-slate-900 underline underline-offset-2" href={toVscodeFileHref(person.sourcePath)}>
          Open Markdown
        </a>
        <button className="text-sm font-medium text-slate-900 underline underline-offset-2" onClick={copyPath} type="button">
          Copy path
        </button>
        <span aria-live="polite" className="text-sm text-slate-600">{copyStatus}</span>
      </div>
      <p className="mt-3 truncate font-mono text-xs text-slate-500" title={person.sourcePath}>{person.sourceRelativePath}</p>
    </aside>
  );
}
