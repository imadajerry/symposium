import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  Layers,
  Code
} from 'lucide-react';

interface InteractiveContentRendererProps {
  content: string;
}

interface MetadataItem {
  key: string;
  value: string;
}

interface ParsedSection {
  id: string;
  title: string;
  rawContent: string;
}

export const InteractiveContentRenderer: React.FC<InteractiveContentRendererProps> = ({ content }) => {
  const [viewMode, setViewMode] = useState<'tabs' | 'accordions'>('tabs');
  const [activeTabId, setActiveTabId] = useState<string>('overview');
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    overview: true
  });

  // 1. Extract Code Blocks first to avoid tampering with code contents
  const codeBlocks: { placeholder: string; language: string; code: string }[] = [];
  let processedContent = content;

  const codeBlockRegex = /```([a-zA-Z0-9-]*)\n([\s\S]*?)```/g;
  let codeMatch;
  let codeIndex = 0;
  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeIndex}__`;
    codeBlocks.push({
      placeholder,
      language: codeMatch[1] || 'plaintext',
      code: codeMatch[2].trim()
    });
    processedContent = processedContent.replace(codeMatch[0], placeholder);
    codeIndex++;
  }

  // 2. Parse Metadata (Key-Value)
  // Look for patterns like **Title:** Text or **Credits:** Number
  const metadata: MetadataItem[] = [];
  const metadataKeys = [
    'course title', 'title', 'credit', 'credits', 'theory sessions', 'prerequisites', 
    'prerequisite', 'examination scheme', 'exam scheme', 'grading', 'duration', 'instructor'
  ];
  
  // Extract horizontal metadata matches like **Credit:** 03 or **Prerequisites:** OOP
  const inlineMetadataRegex = /\*\*([^*:\n]+):\*\*\s*([^\n*]+)(?=\s*\*\*|\s*$|\n)/gi;
  let metaMatch;
  const matchedSlices: string[] = [];
  
  while ((metaMatch = inlineMetadataRegex.exec(processedContent)) !== null) {
    const key = metaMatch[1].trim();
    const val = metaMatch[2].trim();
    if (metadataKeys.some(mk => key.toLowerCase().includes(mk))) {
      metadata.push({ key, value: val });
      matchedSlices.push(metaMatch[0]);
    }
  }

  // Remove the extracted metadata from processed text to avoid duplication
  matchedSlices.forEach(slice => {
    processedContent = processedContent.replace(slice, '');
  });

  // 3. Extract major sections
  // Sections are typically separated by headers like ### Title, ## Title or **Title:** on a new line
  const sections: ParsedSection[] = [];
  
  // Custom splitting strategy based on headers
  const sectionSplitRegex = /(?:\n|^)(?:###|##|\*\*)\s*(Course Objectives|Objectives|Examination Scheme|Grading Scheme|Syllabus Outline|Syllabus Modules|Syllabus Overview|Prerequisites|Recommended Books|Reference Books|Grading Pattern|Syllabus|Evaluation):\*\*?\s*(?:\n|$)/gi;
  
  const splitParts = processedContent.split(sectionSplitRegex);
  let introText = splitParts[0] || '';
  
  // Find all matches for headers to get their titles
  const headerMatches: string[] = [];
  let headerMatch;
  sectionSplitRegex.lastIndex = 0; // reset
  while ((headerMatch = sectionSplitRegex.exec(processedContent)) !== null) {
    headerMatches.push(headerMatch[1].trim());
  }

  // Map parts into structured sections
  for (let i = 1; i < splitParts.length; i += 2) {
    const title = headerMatches[Math.floor(i / 2)] || `Section ${Math.floor(i / 2) + 1}`;
    const rawContent = splitParts[i] || '';
    if (rawContent.trim()) {
      sections.push({
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        rawContent: rawContent.trim()
      });
    }
  }

  // Helper: check if a section is considered large
  const isSectionLarge = (text: string) => {
    return text.length > 250 || text.split('\n').length > 5;
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Render components
  return (
    <div className="w-full space-y-4">
      {/* Visual Header Toolbar */}
      {sections.length > 0 && (
        <div className="flex items-center justify-between border-b border-gray-200/50 pb-2 mb-2 text-xs">
          <span className="font-semibold text-gray-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            Interactive View
          </span>
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200/40">
            <button
              onClick={() => setViewMode('tabs')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                viewMode === 'tabs'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Tabs
            </button>
            <button
              onClick={() => setViewMode('accordions')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                viewMode === 'accordions'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Accordions
            </button>
          </div>
        </div>
      )}

      {/* 1. Show metadata pills if any exist */}
      {metadata.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/40 shadow-sm">
          {metadata.map((item, idx) => (
            <div key={idx} className="flex flex-col p-2 bg-white/90 rounded-lg border border-blue-50 shadow-sm hover:translate-y-[-1px] transition-transform">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.key}</span>
              <span className="text-xs font-semibold text-gray-800 line-clamp-2 mt-0.5">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* View Rendering Logic */}
      {viewMode === 'tabs' && sections.length > 0 ? (
        <div className="space-y-3">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTabId('overview')}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-all -mb-px ${
                activeTabId === 'overview'
                  ? 'border-blue-500 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveTabId(section.id)}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-all -mb-px ${
                  activeTabId === section.id
                    ? 'border-blue-500 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-2 animate-fade-in">
            {activeTabId === 'overview' ? (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {renderInnerContent(introText, codeBlocks)}
              </div>
            ) : (
              sections.map(section => {
                if (section.id !== activeTabId) return null;
                const large = isSectionLarge(section.rawContent);
                return (
                  <div key={section.id} className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      {section.title}
                    </h4>
                    {large ? (
                      <div className="rounded-xl border border-gray-200 bg-white/70 p-3 shadow-inner max-h-[300px] overflow-y-auto">
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {renderInnerContent(section.rawContent, codeBlocks)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {renderInnerContent(section.rawContent, codeBlocks)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Accordions / Standard Flow */
        <div className="space-y-3">
          {/* Intro Text */}
          {introText.trim() && (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {renderInnerContent(introText, codeBlocks)}
            </div>
          )}

          {/* Accordion List */}
          {sections.map(section => {
            const isOpen = openAccordions[section.id] ?? false;
            return (
              <div
                key={section.id}
                className="rounded-xl border border-gray-200/80 bg-white/70 overflow-hidden shadow-sm hover:border-blue-200 transition-colors"
              >
                <button
                  onClick={() => toggleAccordion(section.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    {section.title}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 border-t border-gray-100 text-sm text-gray-700 leading-relaxed bg-white/40">
                    {renderInnerContent(section.rawContent, codeBlocks)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

// Render inner markdown-like content (handles tables, lists, bold, inline code, blocks)
function renderInnerContent(text: string, codeBlocks: any[]): React.ReactNode {
  if (!text) return null;

  // Split content by table blocks and code block placeholders
  const parts = text.split(/(__CODE_BLOCK_PLACEHOLDER_\d+__)/g);

  return (
    <>
      {parts.map((part, index) => {
        // Render Code Block
        if (part.startsWith('__CODE_BLOCK_PLACEHOLDER_')) {
          const matchIdx = part.match(/\d+/);
          if (matchIdx) {
            const block = codeBlocks[parseInt(matchIdx[0], 10)];
            if (block) {
              return <InteractiveCodeBlock key={index} language={block.language} code={block.code} />;
            }
          }
        }

        // Render Table or General Text
        return <React.Fragment key={index}>{renderTablesAndLists(part)}</React.Fragment>;
      })}
    </>
  );
}

// Check for Markdown tables and lists, parsing them accordingly
function renderTablesAndLists(text: string): React.ReactNode {
  // Check for Table formatting: lines containing pipe |
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');

    if (isTableRow) {
      inTable = true;
      // Split by pipe and clean empty edges
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      // Skip markdown alignment dividers like |---|---|
      const isDivider = cells.every(c => c.startsWith(':') || c.startsWith('-') || c.replace(/-+/g, '') === '');
      if (!isDivider) {
        tableRows.push(cells);
      }
    } else {
      if (inTable && tableRows.length > 0) {
        // Render table
        renderedElements.push(<InteractiveTable key={`table-${i}`} rows={tableRows} />);
        tableRows = [];
        inTable = false;
      }

      // Check for List elements
      const listMatch = line.match(/^(\s*)(?:-\s*|\*\s*|•\s*)(.*)/);
      const numberListMatch = line.match(/^(\s*)(\d+)\.\s*(.*)/);

      if (listMatch) {
        renderedElements.push(
          <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-sm text-gray-700 pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
            <span>{renderFormattedInlineText(listMatch[2])}</span>
          </div>
        );
      } else if (numberListMatch) {
        renderedElements.push(
          <div key={`ol-${i}`} className="flex items-start gap-2.5 my-1.5 pl-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-blue-600">
              {numberListMatch[2]}
            </span>
            <span className="text-sm text-gray-700 pt-0.5">{renderFormattedInlineText(numberListMatch[3])}</span>
          </div>
        );
      } else if (line.trim()) {
        // Standard text line
        renderedElements.push(
          <p key={`p-${i}`} className="my-1.5 text-gray-700 leading-relaxed text-sm">
            {renderFormattedInlineText(line)}
          </p>
        );
      }
    }
  }

  // Handle table at the end of the text
  if (inTable && tableRows.length > 0) {
    renderedElements.push(<InteractiveTable key="table-end" rows={tableRows} />);
  }

  return <div className="space-y-1">{renderedElements}</div>;
}

// Formats inline bold (**text**) and inline code (`code`)
function renderFormattedInlineText(text: string): React.ReactNode[] {
  // Regex to split bold tags and backticks
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-gray-900 bg-gray-50 px-1 rounded border border-gray-100/50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded bg-gray-900/10 font-mono text-xs text-indigo-600 border border-gray-200/50">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// 4. Interactive Code Block with Copy Action
const InteractiveCodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 my-3 shadow-lg bg-slate-900">
      <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs text-slate-300 font-mono">
        <span className="flex items-center gap-1.5 uppercase font-semibold">
          <Code className="w-3.5 h-3.5 text-indigo-400" />
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs text-slate-100 font-mono leading-relaxed bg-slate-950/60 max-h-[350px]">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// 5. Interactive Dashboard Table
const InteractiveTable: React.FC<{ rows: string[][] }> = ({ rows }) => {
  if (rows.length === 0) return null;

  const headers = rows[0];
  const bodyRows = rows.slice(1);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm my-3 bg-white">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider">
            {headers.map((cell, idx) => (
              <th key={idx} className="px-4 py-2.5">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-600">
          {bodyRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={`hover:bg-blue-50/20 transition-colors ${
                rowIdx % 2 === 1 ? 'bg-gray-50/30' : ''
              }`}
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-2">
                  {renderFormattedInlineText(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
