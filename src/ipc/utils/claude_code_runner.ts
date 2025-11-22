import { spawn } from "child_process";
import log from "electron-log/main";
import { getClaudeCodePath, UserSettings } from "../../lib/schemas";

const logger = log.scope("claude_code_runner");

export interface ClaudeCodeRunOptions {
  prompt: string;
  cwd?: string;
  settings: UserSettings;
}

export interface ClaudeCodeResponse {
  output: string;
  error?: string;
}

/**
 * Runs Claude Code CLI in non-interactive mode (-p flag)
 * This uses the Claude Code CLI which must be installed and authenticated separately
 * Users need to run `claude /login` to authenticate with their Claude subscription
 */
export async function runClaudeCode({
  prompt,
  cwd = process.cwd(),
  settings,
}: ClaudeCodeRunOptions): Promise<ClaudeCodeResponse> {
  const cliPath = getClaudeCodePath(settings);

  if (!cliPath) {
    throw new Error(
      "Claude Code CLI path not configured. Please set the path in Settings.",
    );
  }

  return new Promise<ClaudeCodeResponse>((resolve, reject) => {
    logger.info(`Running Claude Code CLI: ${cliPath}`);

    // Use -p flag for non-interactive mode (headless)
    const args = ["-p", prompt];

    const process = spawn(cliPath, args, {
      cwd,
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    process.stdout?.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      logger.info(output);
    });

    process.stderr?.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      logger.error(output);
    });

    process.on("close", (code) => {
      if (code === 0) {
        logger.info("Claude Code CLI execution successful");
        resolve({
          output: stdout,
        });
      } else {
        logger.error(`Claude Code CLI failed with exit code ${code}`);

        // Check for common authentication errors
        if (
          stderr.includes("Invalid API key") ||
          stderr.includes("Please run /login")
        ) {
          reject(
            new Error(
              "Claude Code CLI is not authenticated. Please run 'claude /login' in your terminal first.",
            ),
          );
        } else {
          reject(
            new Error(
              `Claude Code CLI failed (exit code ${code})\n\nOutput: ${stdout}\n\nError: ${stderr}`,
            ),
          );
        }
      }
    });

    process.on("error", (err) => {
      logger.error(`Failed to spawn Claude Code CLI: ${cliPath}`, err);
      reject(
        new Error(
          `Failed to start Claude Code CLI. Please check that the CLI is installed at: ${cliPath}\n\nError: ${err.message}`,
        ),
      );
    });
  });
}

/**
 * Checks if Claude Code CLI is available and authenticated
 */
export async function checkClaudeCodeStatus(
  settings: UserSettings,
): Promise<{ available: boolean; authenticated: boolean; error?: string }> {
  const cliPath = getClaudeCodePath(settings);

  if (!cliPath) {
    return {
      available: false,
      authenticated: false,
      error: "CLI path not configured",
    };
  }

  try {
    // Try a simple command to check if authenticated
    const result = await runClaudeCode({
      prompt: "Hello",
      settings,
    });

    return {
      available: true,
      authenticated: true,
    };
  } catch (error: any) {
    if (error.message.includes("not authenticated")) {
      return {
        available: true,
        authenticated: false,
        error: "Not authenticated - run 'claude /login' first",
      };
    }

    return {
      available: false,
      authenticated: false,
      error: error.message,
    };
  }
}
