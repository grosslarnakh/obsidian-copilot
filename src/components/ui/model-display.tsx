import React from "react";
import { CustomModel } from "@/aiParams";
import { getProviderLabel } from "@/utils";
import { Lightbulb, Eye, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelCapability } from "@/constants";

interface ModelDisplayProps {
  model: CustomModel;
  iconSize?: number;
  /** Muted = gray text/icons (trigger), normal = black text/icons (dropdown list) */
  variant?: "muted" | "normal";
  /** Optional class for the capability icons container (e.g. shift icons down) */
  iconContainerClassName?: string;
}

interface ModelCapabilityIconsProps {
  capabilities?: ModelCapability[];
  iconSize?: number;
  /** When "normal", icons use text-normal instead of text-muted */
  variant?: "muted" | "normal";
}

export const ModelCapabilityIcons: React.FC<ModelCapabilityIconsProps> = ({
  capabilities = [],
  iconSize = 16,
  variant = "muted",
}) => {
  const iconClass = variant === "normal" ? "tw-text-normal" : "tw-text-muted";
  return (
    <>
      {capabilities
        .sort((a, b) => a.localeCompare(b))
        .map((cap, index) => {
          switch (cap) {
            case ModelCapability.REASONING:
              return (
                <Lightbulb
                  key={index}
                  className={iconClass}
                  style={{ width: iconSize, height: iconSize }}
                />
              );
            case ModelCapability.VISION:
              return (
                <Eye
                  key={index}
                  className={iconClass}
                  style={{ width: iconSize, height: iconSize }}
                />
              );
            case ModelCapability.WEB_SEARCH:
              return (
                <Globe
                  key={index}
                  className={iconClass}
                  style={{ width: iconSize, height: iconSize }}
                />
              );
            default:
              return null;
          }
        })}
    </>
  );
};

export const ModelDisplay: React.FC<ModelDisplayProps> = ({
  model,
  iconSize = 14,
  variant = "muted",
  iconContainerClassName,
}) => {
  const displayName = model.displayName || model.name;
  const textClass =
    variant === "normal"
      ? "tw-truncate tw-text-xs tw-text-normal"
      : "tw-truncate tw-text-xs tw-text-muted/30 hover:tw-text-normal";
  return (
    <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-1">
      <span className={textClass}>{displayName}</span>
      {model.capabilities && model.capabilities.length > 0 && (
        <div
          className={cn(
            "tw-flex tw-shrink-0 tw-items-center tw-gap-0.5",
            iconContainerClassName
          )}
        >
          <ModelCapabilityIcons
            capabilities={model.capabilities}
            iconSize={iconSize}
            variant={variant}
          />
        </div>
      )}
    </div>
  );
};

export const getModelDisplayText = (model: CustomModel): string => {
  const displayName = model.displayName || model.name;
  const provider = `(${getProviderLabel(model.provider)})`;
  return `${displayName} ${provider}`;
};

export const getModelDisplayWithIcons = (model: CustomModel): string => {
  const displayName = model.displayName || model.name;
  const provider = `(${getProviderLabel(model.provider, model)})`;
  const icons =
    model.capabilities
      ?.map((cap) => {
        switch (cap) {
          case ModelCapability.REASONING:
            return "Reasoning";
          case ModelCapability.VISION:
            return "Vision";
          case ModelCapability.WEB_SEARCH:
            return "Websearch";
          default:
            return "";
        }
      })
      .join("|") || "";
  return `${displayName} ${provider} ${icons}`;
};
