import React, { useEffect, useMemo, useState } from 'react';
import type { TranscriptItem } from 'types';
import { X } from 'lucide-react';
import { ANIMATION, BG, BLUR, BORDER, PADDING, RADIUS, SHADOW, TEXT, TEXT_SIZE, TRANSITION, Z_INDEX } from './design-tokens';

type DetailsSection = 'sources' | 'tools' | 'reasoning' | 'context';

export interface MessageDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: TranscriptItem;
  initialSection?: DetailsSection;
}

function getToolLabel(t: NonNullable<TranscriptItem['tools']>[number]): string {
  const base = (t.name || 'tool').replace(/_/g, ' ');
  return base;
}

export const MessageDetailsDrawer: React.FC<MessageDetailsDrawerProps> = ({
  isOpen,
  onClose,
  item,
  initialSection
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const sources = useMemo(() => {
    const chunks = item.groundingMetadata?.groundingChunks ?? [];
    const out: Array<{ num: number; title: string; url: string }> = [];
    let n = 1;
    for (const c of chunks as any[]) {
      const url = c?.web?.uri || c?.maps?.uri;
      const title = c?.web?.title || c?.maps?.title || 'Source';
      if (typeof url === 'string' && url.trim()) out.push({ num: n++, title, url });
    }
    return out;
  }, [item.groundingMetadata?.groundingChunks]);

  const webSearchQueries = item.groundingMetadata?.webSearchQueries ?? [];
  const hasSources = sources.length > 0 || webSearchQueries.length > 0;
  const hasTools = (item.tools?.length ?? 0) > 0;
  const cotSteps = item.chainOfThought?.steps ?? [];
  const hasReasoningSteps = Array.isArray(cotSteps) && cotSteps.length > 0;
  const hasReasoningText = typeof item.reasoning === 'string' && item.reasoning.trim().length > 0;
  const hasReasoning = hasReasoningSteps || hasReasoningText;
  const hasContext = (item.contextSources?.length ?? 0) > 0;

  const tabs = useMemo(() => {
    const all: Array<{ key: DetailsSection; label: string; available: boolean }> = [
      { key: 'sources', label: 'Sources', available: hasSources },
      { key: 'tools', label: 'Tools', available: hasTools },
      { key: 'reasoning', label: 'Reasoning', available: hasReasoning },
      { key: 'context', label: 'Context', available: hasContext }
    ];
    return all.filter(t => t.available);
  }, [hasContext, hasReasoning, hasSources, hasTools]);

  const [activeTab, setActiveTab] = useState<DetailsSection>('sources');

  useEffect(() => {
    if (!isOpen) return;
    const preferred = initialSection && tabs.some(t => t.key === initialSection) ? initialSection : undefined;
    setActiveTab(preferred ?? tabs[0]?.key ?? 'sources');
  }, [isOpen, initialSection, tabs]);

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 ${Z_INDEX.modal}
        flex items-end justify-center
        bg-black/40 ${BLUR.strong}
        ${ANIMATION.fadeInUp}
      `}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Message details"
    >
      <div
        className={`
          w-full max-w-sm
          ${RADIUS.lg}
          ${BG.glass} ${BORDER.glass}
          ${SHADOW.xl}
          overflow-hidden
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between ${PADDING.md} border-b ${BORDER.subtle}`}>
          <div className={`text-xs font-semibold tracking-wide uppercase ${TEXT.secondary}`}>Details</div>
          <button
            type="button"
            onClick={onClose}
            className={`${TRANSITION.colors} p-2 ${RADIUS.full} ${BG.hover}`}
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`${PADDING.md} border-b ${BORDER.subtle} flex items-center gap-2 overflow-x-auto`}>
          {tabs.length > 0 ? (
            tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`
                  px-3 py-1.5 ${RADIUS.full}
                  ${TEXT_SIZE.metadata} font-medium
                  ${TRANSITION.colors}
                  ${activeTab === t.key ? `${BG.card} ${BORDER.default} ${TEXT.primary}` : `${BG.hover} ${TEXT.muted}`}
                  border
                `}
              >
                {t.label}
              </button>
            ))
          ) : (
            <div className={`${TEXT_SIZE.metadata} ${TEXT.muted}`}>No details</div>
          )}
        </div>

        <div className={`${PADDING.md} max-h-[40vh] overflow-auto`}>
          {tabs.length === 0 && (
            <div className={`${TEXT_SIZE.metadata} ${TEXT.muted}`}>No extra details for this message.</div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-3">
              {webSearchQueries.length > 0 && (
                <div>
                  <div className={`${TEXT_SIZE.metadata} ${TEXT.muted} mb-1`}>Searched</div>
                  <div className="flex flex-wrap gap-2">
                    {webSearchQueries.map((q, i) => (
                      <span
                        key={`${q}-${i}`}
                        className={`px-2 py-1 ${RADIUS.full} ${TEXT_SIZE.metadata} font-mono ${BG.card} ${BORDER.default} ${TEXT.secondary}`}
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        flex items-start gap-3
                        ${PADDING.md} ${RADIUS.md}
                        ${BG.card} ${BORDER.default}
                        ${TRANSITION.colors} ${BG.hover}
                      `}
                    >
                      <span
                        className={`
                          inline-flex items-center justify-center
                          w-6 h-6 ${RADIUS.full}
                          ${BG.subtle} ${BORDER.default}
                          ${TEXT_SIZE.metadata} font-mono ${TEXT.secondary}
                          shrink-0
                        `}
                      >
                        {s.num}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${TEXT.primary} truncate`}>{s.title}</div>
                        <div className={`${TEXT_SIZE.metadata} ${TEXT.muted} break-all`}>{s.url}</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className={`${TEXT_SIZE.metadata} ${TEXT.muted}`}>No sources for this message.</div>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div>
              {hasTools ? (
                <div className="space-y-2">
                  {(item.tools || []).map((t, i) => {
                    const duration =
                      typeof t.startedAt === 'number' && typeof t.finishedAt === 'number'
                        ? Math.max(0, t.finishedAt - t.startedAt)
                        : undefined;
                    return (
                      <details
                        key={`${t.name}-${i}`}
                        className={`${PADDING.md} ${RADIUS.md} ${BG.card} ${BORDER.default}`}
                      >
                        <summary className={`cursor-pointer select-none flex items-center justify-between gap-3 ${TEXT.secondary}`}>
                          <span className="font-medium">{getToolLabel(t)}</span>
                          <span className={`${TEXT_SIZE.metadata} font-mono ${TEXT.muted}`}>
                            {t.state || 'complete'}
                            {typeof duration === 'number' ? ` • ${duration}ms` : ''}
                          </span>
                        </summary>
                        <div className={`mt-3 space-y-2 ${TEXT_SIZE.metadata} ${TEXT.secondary}`}>
                          {t.input !== undefined && (
                            <div>
                              <div className={`${TEXT.muted} mb-1`}>Input</div>
                              <pre className="whitespace-pre-wrap break-words font-mono">{JSON.stringify(t.input, null, 2)}</pre>
                            </div>
                          )}
                          {t.output !== undefined && (
                            <div>
                              <div className={`${TEXT.muted} mb-1`}>Output</div>
                              <pre className="whitespace-pre-wrap break-words font-mono">{JSON.stringify(t.output, null, 2)}</pre>
                            </div>
                          )}
                          {t.error && (
                            <div>
                              <div className={`${TEXT.muted} mb-1`}>Error</div>
                              <pre className="whitespace-pre-wrap break-words font-mono">{t.error}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              ) : (
                <div className={`${TEXT_SIZE.metadata} ${TEXT.muted}`}>No tools for this message.</div>
              )}
            </div>
          )}

          {activeTab === 'reasoning' && (
            <div>
              {hasReasoningSteps ? (
                <div className="space-y-2">
                  {cotSteps.map((s, i) => (
                    <div key={`${s.label}-${i}`} className={`${PADDING.md} ${RADIUS.md} ${BG.card} ${BORDER.default}`}>
                      <div className={`text-sm font-medium ${TEXT.primary}`}>{s.label}</div>
                      {s.description && <div className={`${TEXT_SIZE.metadata} ${TEXT.secondary}`}>{s.description}</div>}
                      <div className={`${TEXT_SIZE.metadata} font-mono ${TEXT.muted} mt-1`}>{s.status}</div>
                    </div>
                  ))}
                </div>
              ) : hasReasoningText ? (
                <pre className={`${PADDING.md} ${RADIUS.md} ${BG.card} ${BORDER.default} whitespace-pre-wrap break-words font-mono ${TEXT.secondary}`}>
                  {item.reasoning}
                </pre>
              ) : (
                <div className={`${TEXT_SIZE.metadata} ${TEXT.muted}`}>No reasoning for this message.</div>
              )}
            </div>
          )}

          {activeTab === 'context' && (
            <div>
              {hasContext ? (
                <div className="space-y-2">
                  {(item.contextSources || []).map((s, i) => (
                    <div key={`${s.type}-${i}`} className={`${PADDING.md} ${RADIUS.md} ${BG.card} ${BORDER.default}`}>
                      <div className={`text-sm font-medium ${TEXT.primary}`}>{s.label}</div>
                      {s.value && <div className={`${TEXT_SIZE.metadata} ${TEXT.secondary}`}>{s.value}</div>}
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${TEXT_SIZE.metadata} ${TEXT.secondary} hover:underline break-all`}
                        >
                          {s.url}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${TEXT_SIZE.metadata} ${TEXT.muted}`}>No context details for this message.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageDetailsDrawer;
