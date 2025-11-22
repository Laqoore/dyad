import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { readSettings, writeSettings } from "../../main/settings";
import { IS_TEST_BUILD } from "../utils/test_utils";
import { checkClaudeCodeStatus } from "../utils/claude_code_runner";

const logger = log.scope("claude_code_handlers");
const handle = createLoggedHandler(logger);

export interface ClaudeCodeStatus {
  configured: boolean;
  available: boolean;
  authenticated: boolean;
  cliPath?: string;
  error?: string;
}

export function registerClaudeCodeHandlers() {
  handle("get-claude-code-status", async (): Promise<ClaudeCodeStatus> => {
    if (IS_TEST_BUILD) {
      return {
        configured: false,
        available: false,
        authenticated: false,
      };
    }

    logger.info("Checking Claude Code CLI status.");

    const settings = readSettings();
    const cliPath = settings.claudeCode?.cliPath;

    if (!cliPath) {
      return {
        configured: false,
        available: false,
        authenticated: false,
        error: "CLI path not configured",
      };
    }

    const status = await checkClaudeCodeStatus(settings);

    return {
      configured: true,
      available: status.available,
      authenticated: status.authenticated,
      cliPath,
      error: status.error,
    };
  });

  handle(
    "set-claude-code-path",
    async (_event, cliPath: string): Promise<void> => {
      logger.info(`Setting Claude Code CLI path: ${cliPath}`);
      writeSettings({
        claudeCode: {
          cliPath,
        },
      });
    },
  );

  handle("clear-claude-code-path", async (): Promise<void> => {
    logger.info("Clearing Claude Code CLI path.");
    writeSettings({
      claudeCode: undefined,
    });
  });
}
