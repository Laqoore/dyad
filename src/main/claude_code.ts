import { readSettings, writeSettings } from "./settings";

export function handleClaudeCodeReturn({
  apiKey,
  subscriptionTier,
  expiresAt,
}: {
  apiKey: string;
  subscriptionTier?: "free" | "pro" | "team";
  expiresAt?: string;
}) {
  const settings = readSettings();
  writeSettings({
    claudeCodeSubscription: {
      apiKey: {
        value: apiKey,
      },
      subscriptionTier,
      expiresAt,
    },
  });
}
