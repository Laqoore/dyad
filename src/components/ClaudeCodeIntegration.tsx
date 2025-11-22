import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, ExternalLink } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { showSuccess, showError } from "@/lib/toast";
import { isClaudeCodeEnabled } from "@/lib/schemas";
import { IpcClient } from "@/ipc/ipc_client";

export function ClaudeCodeIntegration() {
  const { settings } = useSettings();
  const [cliPath, setCliPath] = useState(settings?.claudeCode?.cliPath || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCliPath = async () => {
    setIsSaving(true);
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.callIpc("set-claude-code-path", cliPath);
      showSuccess("Claude Code CLI path saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save CLI path");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCliPath = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.callIpc("clear-claude-code-path");
      setCliPath("");
      showSuccess("Claude Code CLI path cleared");
    } catch (err: any) {
      showError(err.message || "Failed to clear CLI path");
    }
  };

  const isConfigured = isClaudeCodeEnabled(settings);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg shrink-0">
          <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Claude Code CLI
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use Claude via your Max/Pro subscription through the CLI
              </p>
            </div>
            <Button
              onClick={() =>
                window.open("https://claude.ai/download", "_blank")
              }
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              Download CLI
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label
                htmlFor="claude-code-path"
                className="text-xs text-gray-600 dark:text-gray-400"
              >
                CLI Path (e.g., /usr/local/bin/claude or claude)
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="claude-code-path"
                  type="text"
                  placeholder="/usr/local/bin/claude"
                  value={cliPath}
                  onChange={(e) => setCliPath(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleSaveCliPath}
                  disabled={isSaving || !cliPath}
                  size="sm"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                {isConfigured && (
                  <Button
                    onClick={handleClearCliPath}
                    variant="outline"
                    size="sm"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Setup Instructions:</strong>
                <br />
                1. Download and install Claude Code CLI from{" "}
                <a
                  href="https://claude.ai/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  claude.ai/download
                </a>
                <br />
                2. Run{" "}
                <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">
                  claude /login
                </code>{" "}
                in your terminal
                <br />
                3. Authenticate with your Claude Max or Pro subscription
                <br />
                4. Enter the path to the CLI executable above
              </p>
            </div>

            {isConfigured && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                <p className="text-xs text-green-700 dark:text-green-300">
                  <strong>✓ Ready:</strong> Claude Code CLI is configured. You
                  can now select "Claude Code" as your provider and use any
                  Claude model via your subscription without API costs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
