import ReactMarkdown from "react-markdown";

interface MarkdownSectionProps {
  title: string;
  markdown: string;
}

interface MarkdownContentProps {
  markdown: string;
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="detail-prose">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="detail-prose-list list-disc">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="detail-prose-list list-decimal">{children}</ol>
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

const allowedElements = ["p", "ul", "ol", "li", "strong", "em", "code", "a"];

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

export function MarkdownSection({ title, markdown }: MarkdownSectionProps) {
  if (!markdown.trim()) return null;

  return (
    <section aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="detail-section">
      <h3 className="detail-section__heading" id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
        {title}
      </h3>
      <MarkdownContent markdown={markdown} />
    </section>
  );
}
