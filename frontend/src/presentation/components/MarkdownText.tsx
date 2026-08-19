import ReactMarkdown from 'react-markdown';
import { cx } from './utils/cx';

export interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Renders LLM-generated prose (scene narration, chat messages) as markdown
 * instead of raw text - the MJ's structured-output instructions still let
 * it use bold text and lists for readability, so the frontend must actually
 * interpret that instead of showing literal asterisks. Uses `react-markdown`
 * (renders to React elements, never `dangerouslySetInnerHTML`) rather than a
 * hand-rolled parser - this is untrusted third-party text (an LLM response),
 * so a safe-by-default renderer matters here.
 */
export function MarkdownText({ children, className }: MarkdownTextProps) {
  return (
    <div className={cx('flex flex-col gap-xs [&_p]:m-0', className)}>
      <ReactMarkdown
        components={{
          strong: ({ children: strongChildren }) => (
            <strong className="font-body-strong">{strongChildren}</strong>
          ),
          ul: ({ children: listChildren }) => (
            <ul className="list-disc pl-lg flex flex-col gap-xxs">{listChildren}</ul>
          ),
          ol: ({ children: listChildren }) => (
            <ol className="list-decimal pl-lg flex flex-col gap-xxs">{listChildren}</ol>
          ),
          a: ({ children: linkChildren, href }) => (
            <a href={href} className="underline" target="_blank" rel="noreferrer">
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
