"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

const PERSON_TEMPLATE = `---
id: alex-rivera
name: Alex Rivera
company: Example Studio
team: Product
role: Principal
relationship_strength: 3
strategic_relevance: medium
last_contact: 2026-08-20
desired_cadence_days: 45
inner_circle: false
target: false
tags:
  - product
---

# Alex Rivera

## Why they matter

Alex gives thoughtful product advice.

## Context

We met through a cross-team project.

## Conversation Prep

### Their world

### What they care about

### Remember

### Next conversation

## Interactions

### 2026-08-20 — Coffee chat

Discussed product ownership.
`;

interface EmptyVaultViewProps {
  directory: string;
}

export function EmptyVaultView({ directory }: EmptyVaultViewProps) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(PERSON_TEMPLATE);
      setCopyStatus("Template copied.");
    } catch {
      setCopyStatus("Couldn’t copy the template.");
    }
  }

  return (
    <main className="empty-vault">
      <div className="empty-vault__panel">
        <p className="empty-vault__eyebrow">Orbit</p>
        <h1 className="empty-vault__heading">Add your first person</h1>
        <p className="empty-vault__intro">
          Orbit reads one Markdown file per person. Nothing is here yet — create a file in the
          folder below and choose Refresh, or reload this page.
        </p>
        <p className="empty-vault__path">{directory}</p>
        <p className="empty-vault__intro">
          One record must be your own, marked <code className="detail-code">type: self</code>. It
          anchors the map.
        </p>
        <div className="empty-vault__actions">
          <button className="orbit-control" onClick={copyTemplate} type="button">
            <Copy aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
            Copy a starter record
          </button>
          <span aria-live="polite" className="person-detail__status">{copyStatus}</span>
        </div>
      </div>
    </main>
  );
}
