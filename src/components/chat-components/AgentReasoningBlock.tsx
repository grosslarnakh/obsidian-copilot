import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ReasoningStatus } from "@/LLMProviders/chainRunner/utils/AgentReasoningState";
import { ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";

/**
 * Renders one reasoning step: summary always visible; optional detail in a nested collapsible
 */
function ReasoningStepItem({ step }: { step: ReasoningStepDisplay }) {
  const hasDetail = step.detail != null && step.detail.trim() !== "";
  const [detailOpen, setDetailOpen] = useState(false);

  if (!hasDetail) {
    return (
      <li className="agent-reasoning-step">
        {step.summary}
      </li>
    );
  }

  return (
    <li className="agent-reasoning-step">
      <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
        <CollapsibleTrigger asChild>
          <span
            className={cn(
              "tw-inline-flex tw-items-center tw-gap-1 tw-cursor-pointer hover:tw-text-muted",
              detailOpen && "tw-text-muted"
            )}
          >
            <ChevronRight
              className={cn("tw-size-3 tw-shrink-0 tw-transition-transform", detailOpen && "tw-rotate-90")}
            />
            {step.summary}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="tw-mt-1 tw-pl-4 tw-pr-2 tw-py-1 tw-text-[11px] tw-leading-relaxed tw-text-muted tw-whitespace-pre-wrap tw-border-l-2 tw-border-border">
            {step.detail}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/**
 * One step: summary (short label) and optional detail (model's reasoning text)
 */
export interface ReasoningStepDisplay {
  summary: string;
  detail?: string;
}

/**
 * Props for the AgentReasoningBlock component
 */
interface AgentReasoningBlockProps {
  status: ReasoningStatus;
  elapsedSeconds: number;
  steps: ReasoningStepDisplay[];
  isStreaming: boolean;
}

/**
 * Formats elapsed time into a human-readable string
 *
 * @param seconds - Elapsed time in seconds
 * @returns Formatted time string (e.g., "9s" or "1m 30s")
 */
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

/**
 * Animated spinner using a 5-dot cross/plus pattern.
 * Dots light up in sequence with gradient trail, then all dim briefly.
 *
 * Grid positions (cross pattern, no corners):
 *   1
 * 3 4 5
 *   7
 *
 * Animation sequence: 1 → 3 → 7 → 5 → 4 → (all dim) → (all dim) → repeat
 * (top → left → bottom → right → center)
 */
const CopilotSpinner: React.FC = () => {
  // Cross pattern dots: [row, col, animation index]
  // Sequence: top → left → bottom → right → center
  // With positive delays, order is simply: 0 → 1 → 2 → 3 → 4
  const crossDots: { row: number; col: number; animIndex: number }[] = [
    { row: 0, col: 1, animIndex: 0 }, // top - 1st (leads)
    { row: 1, col: 0, animIndex: 1 }, // left - 2nd
    { row: 1, col: 1, animIndex: 4 }, // center - 5th (last)
    { row: 1, col: 2, animIndex: 3 }, // right - 4th
    { row: 2, col: 1, animIndex: 2 }, // bottom - 3rd
  ];

  const dotSize = 2.5;
  const gap = 4;
  const gridSize = dotSize * 3 + gap * 2;

  return (
    <svg
      width={gridSize}
      height={gridSize}
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      className="copilot-spinner"
    >
      {crossDots.map((dot, index) => {
        const cx = dot.col * (dotSize + gap) + dotSize / 2;
        const cy = dot.row * (dotSize + gap) + dotSize / 2;

        return (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r={dotSize / 2}
            // eslint-disable-next-line tailwindcss/no-custom-classname
            className={`copilot-spinner-dot copilot-spinner-dot-${dot.animIndex}`}
          />
        );
      })}
    </svg>
  );
};

/**
 * AgentReasoningBlock - Displays the agent's reasoning process
 *
 * This component replaces the old tool call banner with a more informative
 * reasoning display that shows:
 * - Active spinner during reasoning
 * - Elapsed time counter
 * - Current reasoning steps (last 2)
 * - Collapsible view after completion
 *
 * States:
 * - reasoning: Expanded, showing steps and active spinner
 * - collapsed: Collapsed after reasoning, before response
 * - complete: Response done, expandable to see steps
 */
export const AgentReasoningBlock: React.FC<AgentReasoningBlockProps> = ({
  status,
  elapsedSeconds,
  steps,
  isStreaming,
}) => {
  // Default expanded when there are steps so content is visible; user can collapse via header
  const [isExpanded, setIsExpanded] = useState(
    status === "reasoning" || (status !== "idle" && steps.length > 0)
  );

  // Auto-expand only when entering active reasoning; do not auto-collapse when done
  useEffect(() => {
    if (status === "reasoning") {
      setIsExpanded(true);
    }
  }, [status]);

  // Don't render anything if idle
  if (status === "idle") {
    return null;
  }

  const isActive = status === "reasoning";
  const canExpand = !isActive && steps.length > 0;

  return (
    <Collapsible
      open={canExpand ? isExpanded : isActive}
      onOpenChange={canExpand ? setIsExpanded : undefined}
      disabled={!canExpand}
      className="agent-reasoning-block"
    >
      <CollapsibleTrigger asChild disabled={!canExpand}>
        <div
          className={cn(
            "agent-reasoning-header",
            canExpand && "tw-cursor-pointer",
            !canExpand && "tw-cursor-default"
          )}
          title={canExpand ? (isExpanded ? "Click to collapse" : "Click to expand") : undefined}
          aria-expanded={canExpand ? isExpanded : undefined}
        >
          {/* Spinner or expand chevron */}
          <span className="agent-reasoning-icon">
            {isActive ? (
              <CopilotSpinner />
            ) : (
              <ChevronRight
                className={cn(
                  "tw-size-3 tw-text-muted tw-transition-transform",
                  isExpanded && "tw-rotate-90"
                )}
              />
            )}
          </span>

          {/* Title and timer */}
          <span className="agent-reasoning-title">{isActive ? "Reasoning" : "Thought for"}</span>
          <span className="agent-reasoning-timer">{formatTime(elapsedSeconds)}</span>
        </div>
      </CollapsibleTrigger>

      {/* Steps - visible when expanded or actively reasoning; steps with detail get expandable content */}
      <CollapsibleContent>
        {steps.length > 0 && (
          <ul className="agent-reasoning-steps">
            {steps.map((step, i) => (
              <ReasoningStepItem key={i} step={step} />
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AgentReasoningBlock;
