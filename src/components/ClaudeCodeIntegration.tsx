import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, ExternalLink } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { showSuccess, showError } from "@/lib/toast";
import { isClaudeCodeEnabled } from "@/lib/schemas";

export function ClaudeCodeIntegration() {
  const { settings, updateSettings } = useSettings();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnectFromClaudeCode = async () => {
    setIsDisconnecting(true);
    try {
      const result = await updateSettings({
        claudeCodeSubscription: undefined,
      });
      if (result) {
        showSuccess("Successfully disconnected from Claude Code");
      } else {
        showError("Failed to disconnect from Claude Code");
      }
    } catch (err: any) {
      showError(
        err.message ||
          "An error occurred while disconnecting from Claude Code",
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnectToClaudeCode = () => {
    // Open the Claude Code subscription page
    // In production, this would be the actual subscription URL
    const subscriptionUrl = "https://claude.ai/subscription";
    window.open(subscriptionUrl, "_blank");
  };

  const isConnected = isClaudeCodeEnabled(settings);
  const subscriptionTier = settings?.claudeCodeSubscription?.subscriptionTier;

  if (!isConnected) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Claude Code Subscription
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use Claude without API keys via your Claude Code subscription
              </p>
            </div>
          </div>
          <Button
            onClick={handleConnectToClaudeCode}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            Connect
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Claude Code Subscription
              </h3>
              {subscriptionTier && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                >
                  {subscriptionTier.charAt(0).toUpperCase() +
                    subscriptionTier.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your Claude Code subscription is active
            </p>
          </div>
        </div>
        <Button
          onClick={handleDisconnectFromClaudeCode}
          variant="outline"
          size="sm"
          disabled={isDisconnecting}
          className="flex items-center gap-2"
        >
          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </Button>
      </div>
    </div>
  );
}
