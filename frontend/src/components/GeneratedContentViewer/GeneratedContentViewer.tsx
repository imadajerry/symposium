import React, { useState } from 'react';
import classNames from 'classnames';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  ListChecks,
  Target,
} from 'lucide-react';

interface SyllabusModule {
  title?: string;
  topics?: unknown[];
  objectives?: unknown[];
  summary?: string;
  suggestedStudyContent?: unknown[];
}

interface SyllabusJson {
  modules?: SyllabusModule[];
  topics?: unknown[];
  objectives?: unknown[];
  summaries?: unknown[];
  suggestedStudyContent?: unknown[];
}

function normalizeToString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return val.map(normalizeToString).join(', ');
  if (typeof val === 'object' && val !== null) {
    return Object.values(val).map(normalizeToString).join(': ');
  }
  return '';
}

function normalizeArray(items: unknown): string[] {
  if (items == null) return [];
  if (!Array.isArray(items)) {
    const single = normalizeToString(items);
    return single.trim() ? [single] : [];
  }
  return items.map(normalizeToString).filter((s) => s.trim().length > 0);
}

function tryParse(raw: string): SyllabusJson | null {
  try {
    return JSON.parse(raw) as SyllabusJson;
  } catch {
    return null;
  }
}

function StringList({ items, icon: Icon, color }: { items: unknown[]; icon: React.ElementType; color: string }) {
  const normalizedItems = normalizeArray(items);
  if (normalizedItems.length === 0) return null;
  
  return (
    <ul className="space-y-1">
      {normalizedItems.map((text, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
          <Icon className={classNames('w-3.5 h-3.5 mt-0.5 shrink-0', color)} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function ModuleCard({ module, index }: { module: SyllabusModule; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const title = module.title || `Module ${index + 1}`;

  const topics = normalizeArray(module.topics);
  const objectives = normalizeArray(module.objectives);
  const study = normalizeArray(module.suggestedStudyContent);
  const summary = normalizeToString(module.summary);

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white/80 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
        </div>
        <span className="flex-1 font-semibold text-gray-800 text-sm">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
          {topics.length > 0 && (
            <Section label="Topics Covered">
              <StringList items={topics} icon={BookOpen} color="text-blue-500" />
            </Section>
          )}

          {objectives.length > 0 && (
            <Section label="Learning Objectives">
              <StringList items={objectives} icon={Target} color="text-emerald-500" />
            </Section>
          )}

          {summary && (
            <Section label="Summary">
              <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
            </Section>
          )}

          {study.length > 0 && (
            <Section label="Suggested Study">
              <StringList items={study} icon={Lightbulb} color="text-amber-500" />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  contentJson: string;
}

const GeneratedContentViewer: React.FC<Props> = ({ contentJson }) => {
  const data = tryParse(contentJson);

  if (!data) {
    // Fallback: just show the raw text nicely
    return (
      <pre className="whitespace-pre-wrap text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 overflow-auto max-h-80">
        {contentJson}
      </pre>
    );
  }

  const modules = data.modules ?? [];
  const topLevelTopics = data.topics ?? [];
  const topLevelObjectives = data.objectives ?? [];
  const topLevelSummaries = data.summaries ?? [];
  const topLevelStudy = data.suggestedStudyContent ?? [];

  const hasSummaries = normalizeArray(topLevelSummaries).length > 0;
  const hasAnyContent =
    modules.length > 0 ||
    topLevelTopics.length > 0 ||
    topLevelObjectives.length > 0 ||
    hasSummaries ||
    topLevelStudy.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-500 bg-gray-50/80 rounded-xl border border-gray-100">
        <ClipboardList className="w-8 h-8 mb-2 opacity-50 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">No readable content found</p>
        <p className="text-xs mt-1 text-center max-w-sm text-gray-500">
          The AI couldn't extract any structured information from the provided syllabus. It may be an image-only PDF, scanned document, or contain unreadable text.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Module cards */}
      {modules.length > 0 && (
        <div className="space-y-2">
          {modules.map((mod, i) => (
            <ModuleCard key={i} module={mod} index={i} />
          ))}
        </div>
      )}

      {/* Top-level topics (if no modules) */}
      {modules.length === 0 && topLevelTopics.length > 0 && (
        <div className="rounded-xl border border-gray-200/80 bg-white/80 p-4">
          <Section label="Topics Covered">
            <StringList items={topLevelTopics} icon={BookOpen} color="text-blue-500" />
          </Section>
        </div>
      )}

      {/* Top-level objectives */}
      {topLevelObjectives.length > 0 && (
        <div className="rounded-xl border border-gray-200/80 bg-white/80 p-4">
          <Section label="Learning Objectives">
            <StringList items={topLevelObjectives} icon={Target} color="text-emerald-500" />
          </Section>
        </div>
      )}

      {/* Top-level summaries */}
      {normalizeArray(topLevelSummaries).length > 0 && (
        <div className="rounded-xl border border-gray-200/80 bg-white/80 p-4">
          <Section label="Summary">
            <ul className="space-y-1">
              {normalizeArray(topLevelSummaries).map((text, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <ClipboardList className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* Top-level suggested study */}
      {topLevelStudy.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <Section label="Suggested Study Content">
            <StringList items={topLevelStudy} icon={ListChecks} color="text-amber-600" />
          </Section>
        </div>
      )}
    </div>
  );
};

export default GeneratedContentViewer;
