"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { ConversationPrep } from "@/types/person";
import { MarkdownContent } from "./MarkdownSection";

export const CONVERSATION_PREP_TEMPLATE = `## Conversation Prep

### Their world

### What they care about

### Remember

### Next conversation
`;

const durableSections: ReadonlyArray<{
  key: "theirWorld" | "whatTheyCareAbout" | "remember";
  label: string;
}> = [
  { key: "theirWorld", label: "Their world" },
  { key: "whatTheyCareAbout", label: "What they care about" },
  { key: "remember", label: "Remember" },
];

export function hasConversationPrep(prep: ConversationPrep): boolean {
  return Object.values(prep).some((value) => value.trim().length > 0);
}

export function hasDurablePrep(prep: ConversationPrep): boolean {
  return durableSections.some(({ key }) => prep[key].trim().length > 0);
}

/**
 * The panel's one job is answering "what do I do next with this person", so the
 * two actionable sections sit together at the top in the only bordered block.
 */
export function NextActions({ prep, followUp }: { prep: ConversationPrep; followUp: string }) {
  const nextConversation = prep.nextConversation.trim();
  const trimmedFollowUp = followUp.trim();

  if (!nextConversation && !trimmedFollowUp) return <PrepEmptyState />;

  return (
    <section aria-labelledby="next-actions-heading" className="next-actions">
      <h3 className="next-actions__heading" id="next-actions-heading">Do next</h3>
      {nextConversation && (
        <div className="next-actions__group">
          <h4 className="next-actions__subheading">Next conversation</h4>
          <MarkdownContent markdown={prep.nextConversation} />
        </div>
      )}
      {trimmedFollowUp && (
        <div className="next-actions__group">
          <h4 className="next-actions__subheading">Follow-up</h4>
          <MarkdownContent markdown={followUp} />
        </div>
      )}
    </section>
  );
}

function PrepEmptyState() {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(CONVERSATION_PREP_TEMPLATE);
      setCopyStatus("Template copied.");
    } catch {
      setCopyStatus("Couldn’t copy template.");
    }
  }

  return (
    <div className="conversation-prep__empty">
      <p>Nothing planned yet. Add known context and questions that can make the next conversation more useful.</p>
      <button
        aria-label="Copy Conversation Prep template"
        className="text-action"
        onClick={copyTemplate}
        type="button"
      >
        <Copy aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
        Copy template
      </button>
      <span aria-live="polite" className="person-detail__status">{copyStatus}</span>
    </div>
  );
}

/** The durable, slow-changing half of prep: read before a conversation, rarely edited. */
export function PrepDisclosures({ prep }: { prep: ConversationPrep }) {
  const present = durableSections.filter(({ key }) => prep[key].trim());
  if (present.length === 0) return null;

  return (
    <section aria-labelledby="conversation-prep-heading" className="conversation-prep">
      <h3
        className="detail-section__heading detail-section__heading--quiet"
        id="conversation-prep-heading"
      >
        Conversation prep
      </h3>
      <div className="conversation-prep__content">
        {present.map(({ key, label }, index) => (
          <details className="conversation-prep__disclosure" key={key} open={index === 0}>
            <summary className="conversation-prep__summary">{label}</summary>
            <div className="conversation-prep__body">
              <MarkdownContent markdown={prep[key]} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
