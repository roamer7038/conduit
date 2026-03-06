'use client';

import React, { memo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import clsx from 'clsx';
import { Components } from 'react-markdown';

// Mermaid rendering component
const MermaidDiagram = memo(({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  // generate a unique id that does not start with a number
  const [id] = useState(() => `mermaid-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });

    let isMounted = true;
    let fallbackTimer: ReturnType<typeof setTimeout>;
    let renderTimer: ReturnType<typeof setTimeout>;

    // Check if the chart is empty or incomplete during streaming
    if (!chart || chart.trim() === '') return;

    const renderChart = async () => {
      try {
        // Validate syntax to avoid Mermaid's global error overlay if possible
        let isValid = true;
        try {
          const parseResult = await mermaid.parse(chart, { suppressErrors: true });
          if (parseResult === false) isValid = false;
        } catch (e) {
          isValid = false;
        }

        if (!isValid) {
          throw new Error('Mermaid syntax error');
        }

        const result = await mermaid.render(id, chart);

        // Mermaid sometimes handles errors gracefully returning a huge SVG that breaks the UI container
        if (result.svg.includes('Syntax error') || result.svg.includes('SyntaxError')) {
          throw new Error('Mermaid fallback error SVG detected');
        }

        if (isMounted) {
          setSvg(result.svg);
          setError(false);
        }
      } catch (e) {
        console.error('Mermaid rendering error:', e);
        fallbackTimer = setTimeout(() => {
          if (isMounted) setError(true);
        }, 800);
      }
    };

    // Debounce the rendering by 300ms to avoid constant re-renders layout shifting during streaming
    renderTimer = setTimeout(() => {
      renderChart();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      clearTimeout(renderTimer);
    };
  }, [chart, id]);

  if (error && !svg) {
    return (
      <div className='p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20 overflow-x-auto text-sm my-4'>
        <p className='font-semibold mb-2'>Invalid or incomplete Mermaid diagram:</p>
        <pre className='whitespace-pre-wrap'>{chart}</pre>
      </div>
    );
  }

  return (
    <div
      className='flex justify-center my-4 overflow-x-auto overflow-y-hidden rounded-md border bg-white p-4 min-h-[100px] shadow-sm'
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});
MermaidDiagram.displayName = 'MermaidDiagram';

const markdownComponents: Components = {
  pre({ children, ...props }) {
    return (
      <pre className='!p-0 !m-0 !bg-transparent !border-0' {...props}>
        {children}
      </pre>
    );
  },
  code(props) {
    const { children, className, node, ref, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const rawContent = String(children);
    const content = rawContent.replace(/\n$/, '');
    const isBlock = Boolean(match || rawContent.endsWith('\n') || content.includes('\n'));

    if (isBlock && language === 'mermaid') {
      return <MermaidDiagram chart={content} />;
    }

    return isBlock ? (
      <SyntaxHighlighter
        {...(rest as Record<string, unknown>)}
        style={vscDarkPlus as Record<string, React.CSSProperties>}
        language={language || 'text'}
        PreTag='div'
        customStyle={{
          margin: 0,
          padding: '1rem',
          borderRadius: '0.375rem',
          fontSize: '0.85rem',
          backgroundColor: '#1e1e1e'
        }}
      >
        {content}
      </SyntaxHighlighter>
    ) : (
      <code
        {...rest}
        className={clsx(
          'bg-muted text-foreground px-1.5 py-0.5 rounded-sm font-mono text-sm before:content-none after:content-none',
          className
        )}
      >
        {children}
      </code>
    );
  },
  table({ children, ...props }) {
    return (
      <div className='w-full overflow-x-auto my-4'>
        <table className='w-full' {...props}>
          {children}
        </table>
      </div>
    );
  },
  a({ children, href, ...props }) {
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-primary hover:underline font-medium'
        {...props}
      >
        {children}
      </a>
    );
  },
  p({ children, ...props }) {
    // Override p to avoid text color overriding in prose
    return (
      <p className='mb-4 last:mb-0 leading-7 text-inherit' {...props}>
        {children}
      </p>
    );
  },
  ul({ children, ...props }) {
    return (
      <ul className='list-disc pl-6 mb-4 space-y-1 text-inherit' {...props}>
        {children}
      </ul>
    );
  },
  ol({ children, ...props }) {
    return (
      <ol className='list-decimal pl-6 mb-4 space-y-1 text-inherit' {...props}>
        {children}
      </ol>
    );
  },
  li({ children, ...props }) {
    return (
      <li className='leading-7 text-inherit' {...props}>
        {children}
      </li>
    );
  },
  h1({ children, ...props }) {
    return (
      <h1 className='text-2xl font-bold mt-6 mb-4 text-inherit' {...props}>
        {children}
      </h1>
    );
  },
  h2({ children, ...props }) {
    return (
      <h2 className='text-xl font-bold mt-6 mb-4 border-b pb-2 text-inherit' {...props}>
        {children}
      </h2>
    );
  },
  h3({ children, ...props }) {
    return (
      <h3 className='text-lg font-bold mt-6 mb-4 text-inherit' {...props}>
        {children}
      </h3>
    );
  },
  blockquote({ children, ...props }) {
    return (
      <blockquote className='border-l-4 border-muted-foreground/50 pl-4 italic text-muted-foreground my-4' {...props}>
        {children}
      </blockquote>
    );
  }
};

const remarkPluginsList = [remarkGfm];

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = memo(({ content }: MarkdownRendererProps) => {
  return (
    <div className='prose prose-sm dark:prose-invert max-w-none break-words text-inherit'>
      <ReactMarkdown remarkPlugins={remarkPluginsList} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';
