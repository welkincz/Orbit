import ReactMarkdown from "react-markdown";

interface MarkdownSectionProps {
  title: string;
  markdown: string;
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm leading-6 text-slate-700">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a className="underline underline-offset-2" href={href}>{children}</a>
  ),
};

const allowedElements = ["p", "ul", "ol", "li", "strong", "em", "code", "a"];

export function MarkdownSection({ title, markdown }: MarkdownSectionProps) {
  if (!markdown.trim()) return null;

  return (
    <section aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-950" id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
        {title}
      </h3>
      <ReactMarkdown
        allowedElements={allowedElements}
        components={markdownComponents}
        unwrapDisallowed
      >
        {markdown}
      </ReactMarkdown>
    </section>
  );
}
