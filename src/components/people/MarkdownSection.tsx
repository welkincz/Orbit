import ReactMarkdown from "react-markdown";
import { headingId } from "@/lib/format";

interface MarkdownSectionProps {
  title: string;
  markdown: string;
  /** Recall-tier sections sit below the actionable block and read quieter. */
  quiet?: boolean;
}

interface MarkdownContentProps {
  markdown: string;
}

type MarkdownChildren = { children?: React.ReactNode };

// Every notes heading renders at h4 so it nests under the section's own h3
// rather than competing with the panel outline.
const notesHeading = ({ children }: MarkdownChildren) => (
  <h4 className="detail-prose-heading">{children}</h4>
);

const markdownComponents = {
  h1: notesHeading,
  h2: notesHeading,
  h3: notesHeading,
  h4: notesHeading,
  h5: notesHeading,
  h6: notesHeading,
  blockquote: ({ children }: MarkdownChildren) => (
    <blockquote className="detail-prose-quote">{children}</blockquote>
  ),
  pre: ({ children }: MarkdownChildren) => (
    <pre className="detail-prose-pre">{children}</pre>
  ),
  hr: () => <hr className="detail-prose-rule" />,
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="detail-prose">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="detail-prose-list">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="detail-prose-list">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="detail-code">{children}</code>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a className="text-action" href={href}>{children}</a>
  ),
};

// Images stay out on purpose: a remote image in a local-first app would make a
// network request on behalf of private relationship notes.
const allowedElements = [
  "p", "ul", "ol", "li", "strong", "em", "code", "a",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "hr", "del",
];

export function MarkdownContent({ markdown }: MarkdownContentProps) {
  if (!markdown.trim()) return null;

  return (
    <ReactMarkdown
      allowedElements={allowedElements}
      components={markdownComponents}
      unwrapDisallowed
    >
      {markdown}
    </ReactMarkdown>
  );
}

export function MarkdownSection({ title, markdown, quiet = false }: MarkdownSectionProps) {
  if (!markdown.trim()) return null;

  const sectionId = headingId(title);

  return (
    <section aria-labelledby={sectionId} className="detail-section">
      <h3
        className={`detail-section__heading${quiet ? " detail-section__heading--quiet" : ""}`}
        id={sectionId}
      >
        {title}
      </h3>
      <MarkdownContent markdown={markdown} />
    </section>
  );
}
