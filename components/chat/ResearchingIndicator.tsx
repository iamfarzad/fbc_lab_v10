"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface ResearchingIndicatorProps {
  isResearching: boolean;
  reasoning?: string | undefined; // Glass Box UI: Streamed reasoning text
}

const researchingSteps = [
  "Gathering company intelligence...",
  "\n\nSearching LinkedIn profiles and company data...",
  "\n\nAnalyzing industry trends and competitors...",
  "\n\nBuilding personalized context...",
].join("");

export const ResearchingIndicator: React.FC<ResearchingIndicatorProps> = ({ 
  isResearching,
  reasoning
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);
  const [tokens, setTokens] = useState<string[]>([]);

  // Function to chunk text into fake tokens of 3-4 characters
  const chunkIntoTokens = useCallback((text: string): string[] => {
    const tokens: string[] = [];
    let i = 0;
    while (i < text.length) {
      const chunkSize = Math.floor(Math.random() * 2) + 3; // Random size between 3-4
      tokens.push(text.slice(i, i + chunkSize));
      i += chunkSize;
    }
    return tokens;
  }, []);

  // Glass Box UI: Use real reasoning if available, otherwise fall back to fake tokens
  const hasRealReasoning = !!reasoning && reasoning.trim().length > 0;

  // Initialize when research starts
  useEffect(() => {
    if (isResearching) {
      if (hasRealReasoning) {
        // Use real reasoning text
        setContent(reasoning);
        setIsOpen(true);
      } else {
        // Fall back to fake tokenized steps
        const tokenizedSteps = chunkIntoTokens(researchingSteps);
        setTokens(tokenizedSteps);
        setContent("");
        setCurrentTokenIndex(0);
        setIsOpen(true);
      }
    } else {
      // Reset when research completes
      setContent("");
      setCurrentTokenIndex(0);
      setIsOpen(false);
    }
  }, [isResearching, hasRealReasoning, reasoning, chunkIntoTokens]);

  // Stream tokens (only if using fake tokens)
  useEffect(() => {
    if (hasRealReasoning || !isResearching || currentTokenIndex >= tokens.length) {
      if (isResearching && hasRealReasoning) {
        // Update content with latest reasoning
        setContent(reasoning || "");
      } else if (isResearching && currentTokenIndex >= tokens.length) {
        // Loop back to beginning if still researching
        setCurrentTokenIndex(0);
        setContent("");
      }
      return;
    }

    const timer = setTimeout(() => {
      setContent((prev) => prev + tokens[currentTokenIndex]);
      setCurrentTokenIndex((prev) => prev + 1);
    }, 25); // Faster interval since we're streaming smaller chunks

    return () => clearTimeout(timer);
  }, [isResearching, currentTokenIndex, tokens, hasRealReasoning, reasoning]);

  if (!isResearching && !isOpen) {
    return null;
  }

  return (
    <div className="w-full mb-3 animate-fade-in-up">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group/btn select-none w-full"
      >
        <div className={`p-1 rounded-md transition-colors ${isOpen ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'text-zinc-400 group-hover/btn:text-zinc-600 dark:group-hover/btn:text-zinc-300'}`}>
          <Search className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wide">
          {isOpen ? 'Researching...' : 'Show Research Progress'}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div 
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 text-[10px] sm:text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 font-mono bg-zinc-50/50 dark:bg-zinc-900/50 p-3 sm:p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400/50 to-transparent"></div>
            {content || (isResearching ? "Initializing research..." : "")}
            {isResearching && (
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-1 animate-pulse"></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

