import fetch from "node-fetch";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { readSettings } from "../../main/settings";
import { IS_TEST_BUILD } from "../utils/test_utils";

const logger = log.scope("claude_code_handlers");
const handle = createLoggedHandler(logger);

export interface ClaudeCodeSubscriptionInfo {
  isActive: boolean;
  tier?: "free" | "pro" | "team";
  expiresAt?: string;
}

export function registerClaudeCodeHandlers() {
  handle(
    "get-claude-code-subscription",
    async (): Promise<ClaudeCodeSubscriptionInfo | null> => {
      if (IS_TEST_BUILD) {
        return null;
      }
      logger.info("Fetching Claude Code subscription information.");

      const settings = readSettings();
      const subscription = settings.claudeCodeSubscription;

      if (!subscription?.apiKey?.value) {
        logger.info("Claude Code subscription is not configured.");
        return null;
      }

      // For now, return the stored subscription info
      // In a real implementation, this could validate with Claude Code API
      return {
        isActive: true,
        tier: subscription.subscriptionTier,
        expiresAt: subscription.expiresAt,
      };
    },
  );

  handle("disconnect-claude-code", async (): Promise<void> => {
    logger.info("Disconnecting Claude Code subscription.");
    const { writeSettings } = await import("../../main/settings");
    writeSettings({
      claudeCodeSubscription: undefined,
    });
  });
}
