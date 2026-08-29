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

interface ConversationPrepPanelProps {
  prep: ConversationPrep;
}

const durableSections: ReadonlyArray<{
  key: "theirWorld" | "whatTheyCareAbout" | "remember";
  label: string;
}> = [
  { key: "theirWorld", label: "Their world" },
  { key: "whatTheyCareAbout", label: "What they care about" },
  { key: "remember", label: "Remember" },
];

function hasConversationPrep(prep: ConversationPrep): boolean {
  return Object.values(prep).some((value) => value.trim().length > 0);
}

export function ConversationPrepPanel({ prep }: ConversationPrepPanelProps) {
  const [copyStatus, setCopyStatus] = useState("");
  const hasPrep = hasConversationPrep(prep);

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(CONVERSATION_PREP_TEMPLATE);
      setCopyStatus("Template copied.");
    } catch {
      setCopyStatus("Couldn’t copy template.");
    }
  }

  return (
    <section aria-labelledby="conversation-prep-heading" className="conversation-prep">
      <h3 className="detail-section__heading" id="conversation-prep-heading">Conversation Prep</h3>
      {hasPrep ? (
        <div className="conversation-prep__content">
          {prep.nextConversation.trim() && (
            <section aria-labelledby="next-conversation-heading" className="conversation-prep__next">
              <h4 className="conversation-prep__subheading" id="next-conversation-heading">Next conversation</h4>
              <MarkdownContent markdown={prep.nextConversation} />
            </section>
          )}
          {durableSections.map(({ key, label }, index) => prep[key].trim() ? (
            <details className="conversation-prep__disclosure" key={key} open={index === 0}>
              <summary className="conversation-prep__summary">{label}</summary>
              <div className="conversation-prep__body">
                <MarkdownContent markdown={prep[key]} />
              </div>
            </details>
          ) : null)}
        </div>
      ) : (
        <div className="conversation-prep__empty">
          <p>Add known context and questions that can make the next conversation more useful.</p>
          <button
            aria-label="Copy Conversation Prep template"
            className="text-action"
            onClick={copyTemplate}
            type="button"
          >
            <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            Copy template
          </button>
          <span aria-live="polite" className="person-detail__status">{copyStatus}</span>
        </div>
      )}
    </section>
  );
}
