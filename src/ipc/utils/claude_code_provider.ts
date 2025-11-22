import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
  LanguageModelV2FinishReason,
} from "@ai-sdk/provider";
import { spawn } from "child_process";
import log from "electron-log/main";
import { getClaudeCodePath, UserSettings } from "../../lib/schemas";

const logger = log.scope("claude_code_provider");

interface ClaudeCodeProviderSettings {
  cliPath: string;
  modelName: string;
  settings: UserSettings;
}

/**
 * Custom LanguageModelV2 provider that wraps Claude Code CLI
 * This allows using Claude Max/Pro subscription without API costs
 */
export class ClaudeCodeProvider implements LanguageModelV2 {
  readonly specificationVersion = "v2";
  readonly modelId: string;
  readonly provider = "claude-code";
  private readonly cliPath: string;
  private readonly settings: UserSettings;

  constructor(config: ClaudeCodeProviderSettings) {
    this.cliPath = config.cliPath;
    this.modelId = config.modelName;
    this.settings = config.settings;
  }

  get supportedUrls():
    | Record<string, RegExp[]>
    | PromiseLike<Record<string, RegExp[]>> {
    return {};
  }

  async doGenerate(
    options: LanguageModelV2CallOptions,
  ): Promise<{
    text?: string;
    finishReason: LanguageModelV2FinishReason;
    usage: { promptTokens: number; completionTokens: number };
  }> {
    logger.info("Running Claude Code CLI in non-streaming mode");

    const prompt = this.buildPromptFromMessages(options);

    return new Promise((resolve, reject) => {
      const args = ["-p", prompt];
      const process = spawn(this.cliPath, args, {
        stdio: "pipe",
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve({
            text: stdout.trim(),
            finishReason: "stop",
            usage: {
              promptTokens: this.estimateTokens(prompt),
              completionTokens: this.estimateTokens(stdout),
            },
          });
        } else {
          const errorMessage = this.parseCliError(stderr);
          reject(new Error(errorMessage));
        }
      });

      process.on("error", (err) => {
        reject(
          new Error(
            `Failed to start Claude Code CLI at ${this.cliPath}: ${err.message}`,
          ),
        );
      });
    });
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    rawCall?: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
  }> {
    logger.info("Running Claude Code CLI in streaming mode");

    const prompt = this.buildPromptFromMessages(options);
    const args = ["-p", prompt];

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      start: async (controller) => {
        try {
          const process = spawn(this.cliPath, args, {
            stdio: "pipe",
          });

          let stderr = "";
          let hasStarted = false;

          // Handle stderr
          process.stderr?.on("data", (data) => {
            stderr += data.toString();
            logger.error("CLI stderr:", data.toString());
          });

          // Stream stdout as text deltas
          process.stdout?.on("data", (data) => {
            const text = data.toString();

            if (!hasStarted) {
              // Send stream start event
              controller.enqueue({
                type: "response-metadata",
                id: `claude-code-${Date.now()}`,
                modelId: this.modelId,
                timestamp: new Date(),
              });
              hasStarted = true;
            }

            // Send text delta
            controller.enqueue({
              type: "text-delta",
              textDelta: text,
            });
          });

          // Handle process completion
          process.on("close", (code) => {
            if (code === 0) {
              // Send finish event
              controller.enqueue({
                type: "finish",
                finishReason: "stop",
                usage: {
                  promptTokens: this.estimateTokens(prompt),
                  completionTokens: 0, // We don't have accurate token counts from CLI
                },
              });
              controller.close();
            } else {
              const errorMessage = this.parseCliError(stderr);
              controller.error(new Error(errorMessage));
            }
          });

          // Handle process errors
          process.on("error", (err) => {
            controller.error(
              new Error(
                `Failed to start Claude Code CLI at ${this.cliPath}: ${err.message}`,
              ),
            );
          });
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return { stream };
  }

  /**
   * Build a prompt string from AI SDK messages
   */
  private buildPromptFromMessages(options: LanguageModelV2CallOptions): string {
    const messages = options.prompt;
    let prompt = "";

    // Add system message if present
    if (options.prompt.some((msg) => msg.role === "system")) {
      const systemMessages = options.prompt
        .filter((msg) => msg.role === "system")
        .map((msg) => msg.content.map((c) => ("text" in c ? c.text : "")).join("\n"))
        .join("\n");
      prompt += `System: ${systemMessages}\n\n`;
    }

    // Add conversation history
    for (const message of messages) {
      if (message.role === "system") continue;

      const role = message.role === "user" ? "Human" : "Assistant";
      const content = message.content
        .map((c) => {
          if ("text" in c) return c.text;
          if ("image" in c) return "[Image attached]";
          return "";
        })
        .join("\n");

      prompt += `${role}: ${content}\n\n`;
    }

    return prompt.trim();
  }

  /**
   * Parse CLI error messages and provide helpful feedback
   */
  private parseCliError(stderr: string): string {
    const lowerStderr = stderr.toLowerCase();

    if (lowerStderr.includes("invalid api key") || lowerStderr.includes("please run /login")) {
      return (
        "Claude Code CLI is not authenticated.\n\n" +
        "Please run 'claude /login' in your terminal to authenticate with your Claude subscription.\n\n" +
        `Error details: ${stderr}`
      );
    }

    if (lowerStderr.includes("command not found") || lowerStderr.includes("no such file")) {
      return (
        `Claude Code CLI not found at path: ${this.cliPath}\n\n` +
        "Please check that:\n" +
        "1. Claude Code CLI is installed (download from https://claude.ai/download)\n" +
        "2. The CLI path in settings is correct\n\n" +
        `Error details: ${stderr}`
      );
    }

    if (lowerStderr.includes("rate limit") || lowerStderr.includes("quota")) {
      return (
        "Claude Code usage limit reached.\n\n" +
        "Your Claude subscription has hit its usage limit. Please try again later or upgrade your plan.\n\n" +
        `Error details: ${stderr}`
      );
    }

    return `Claude Code CLI error:\n${stderr}`;
  }

  /**
   * Estimate token count (rough approximation)
   * Claude typically uses ~4 characters per token
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Create a Claude Code provider instance
 */
export function createClaudeCodeProvider(
  modelName: string,
  settings: UserSettings,
): ClaudeCodeProvider {
  const cliPath = getClaudeCodePath(settings);

  if (!cliPath) {
    throw new Error(
      "Claude Code CLI path not configured. Please set the path in Settings.",
    );
  }

  return new ClaudeCodeProvider({
    cliPath,
    modelName,
    settings,
  });
}
