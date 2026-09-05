/**
 * local-llm-engine.js
 *
 * Thin wrapper around @mlc-ai/web-llm that runs an LLM in the browser via
 * WebGPU, hiding stream handling, message history and load state from the
 * caller.
 *
 * Usage in the browser, no build, no npm: the @mlc-ai/web-llm bare specifier
 * is resolved by an import map pointed at the CDN. In the page, before any
 * module script:
 *   <script type="importmap">
 *     { "imports": { "@mlc-ai/web-llm": "https://esm.run/@mlc-ai/web-llm" } }
 *   </script>
 *
 * then in the module:
 *   import { LocalLLMEngine } from "./local-llm-engine.js";
 *
 * The model catalogue and persistence helpers below allow the user to pick
 * a lighter WebLLM model when a heavier one (e.g. Phi-3.5-mini) crashes the
 * GPU adapter with a GPUDeviceLostInfo error.
 */

import * as webllm from "@mlc-ai/web-llm";

/** Possible engine states. */
export const EngineStatus = Object.freeze({
    IDLE: "idle",
    LOADING: "loading",
    READY: "ready",
    GENERATING: "generating",
    ERROR: "error",
});

/**
 * Curated list of WebLLM prebuilt model IDs the user can choose from.
 * Ordered from lightest to heaviest. The UI uses this list to build the
 * selector; the fallback ladder also walks it from the chosen id downward.
 */
export const LLM_MODELS = Object.freeze([
    {
        id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        label: "Light (0.5B)",
        vram: "~0.5 GB",
    },
    {
        id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        label: "Balanced (1B)",
        vram: "~0.8 GB",
    },
    {
        id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        label: "Quality (1.5B)",
        vram: "~1.0 GB",
    },
    {
        id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
        label: "Max (3.8B)",
        vram: "~2.3 GB",
    },
]);

export const DEFAULT_MODEL_ID = LLM_MODELS[0].id;

export const STORAGE_KEY = "tama.llm.modelId";

/**
 * Read the saved model id from localStorage. Falls back to the default if
 * nothing is stored or the stored value is no longer in the catalogue
 * (e.g. the catalogue was edited).
 */
export function getSavedModelId() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && LLM_MODELS.some((m) => m.id === stored)) {
            return stored;
        }
    } catch {
        // localStorage may be unavailable (private mode, sandboxed iframe);
        // silently fall through to the default.
    }
    return DEFAULT_MODEL_ID;
}

/** Persist the model id so future sessions use it. */
export function saveModelId(id) {
    if (!LLM_MODELS.some((m) => m.id === id)) return;
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch {
        // ignore: storage may be disabled; in-memory preference still applies
    }
}

/** Return the model index in the catalogue (lightest = 0). */
function tierIndex(modelId) {
    return LLM_MODELS.findIndex((m) => m.id === modelId);
}

export class LocalLLMEngine extends EventTarget {
    /**
     * @param {string} [modelId] MLC prebuilt model id, e.g. "Llama-3.2-1B-Instruct-q4f16_1-MLC"
     * @param {Object} [options]
     * @param {string} [options.systemPrompt] Initial system prompt
     * @param {number} [options.temperature] Sampling temperature (default 0.7)
     * @param {boolean} [options.autoFallback] If true, init() retries the next-smaller
     *   tier in LLM_MODELS after a device-lost or generic init failure. Default true.
     */
    constructor(modelId = DEFAULT_MODEL_ID, options = {}) {
        super();
        this.modelId = modelId;
        this.options = {
            systemPrompt: options.systemPrompt ?? "You are a helpful and concise AI assistant.",
            temperature: options.temperature ?? 0.7,
            autoFallback: options.autoFallback ?? true,
        };

        this.engine = null;
        this.status = EngineStatus.IDLE;
        this.history = [];
    }

    /** Check whether the current browser supports WebGPU, without instantiating anything. */
    static isSupported() {
        return typeof navigator !== "undefined" && !!navigator.gpu;
    }

    /**
     * Initialise the engine (download weights + allocate WebGPU memory).
     * Emits "progress" ({ text, progress }) and "statuschange" (state) events.
     * No-op if the engine is already initialised.
     *
     * If autoFallback is enabled (default) and the chosen model fails to
     * initialise (commonly with GPUDeviceLostInfo on low-VRAM devices),
     * init() walks the catalogue to the next-smaller tier and retries once.
     */
    async init() {
        if (this.engine) return;

        if (!LocalLLMEngine.isSupported()) {
            const err = new Error("WebGPU is not supported in this browser.");
            this._fail(err);
            throw err;
        }

        this._setStatus(EngineStatus.LOADING);

        // Build the candidate list: just the chosen model when autoFallback
        // is off, otherwise every tier from the chosen one (lightest) down.
        const startIdx = tierIndex(this.modelId);
        const fallbackAllowed = this.options.autoFallback !== false;
        const candidates = startIdx >= 0
            ? (fallbackAllowed ? LLM_MODELS.slice(startIdx) : [LLM_MODELS[startIdx]])
            : [LLM_MODELS[0]];

        let lastErr = null;
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const isFallback = i > 0;
            try {
                this.engine = await webllm.CreateMLCEngine(candidate.id, {
                    initProgressCallback: (report) => {
                        this.dispatchEvent(
                            new CustomEvent("progress", {
                                detail: { text: report.text, progress: report.progress },
                            })
                        );
                    },
                });

                this.modelId = candidate.id;
                this.history = [{ role: "system", content: this.options.systemPrompt }];

                if (isFallback) {
                    this.dispatchEvent(
                        new CustomEvent("fallback", {
                            detail: { modelId: candidate.id, label: candidate.label },
                        })
                    );
                }

                this._setStatus(EngineStatus.READY);
                return;
            } catch (err) {
                lastErr = err;
                // Best-effort cleanup before trying the next tier.
                try { await this.engine?.unload?.(); } catch { /* ignore */ }
                this.engine = null;
                if (!isFallback) continue; // try the next-smaller tier
                break; // already on fallback and it failed: give up
            }
        }

        this._fail(lastErr ?? new Error("Failed to initialise the LLM engine."));
        throw lastErr ?? new Error("Failed to initialise the LLM engine.");
    }

    /**
     * Send a user message and return the reply, taking care of conversation
     * history internally.
     *
     * @param {string} prompt User message text
     * @param {Object} [opts]
     * @param {boolean} [opts.stream] If true (default) stream the response
     * @param {(delta: string, fullText: string) => void} [opts.onChunk] Per-chunk callback (streaming only)
     * @returns {Promise<string>} Full reply text
     */
    async ask(prompt, { stream = true, onChunk } = {}) {
        this._ensureReady();

        this.history.push({ role: "user", content: prompt });
        this._setStatus(EngineStatus.GENERATING);

        try {
            if (!stream) {
                const completion = await this.engine.chat.completions.create({
                    messages: this.history,
                    temperature: this.options.temperature,
                });
                const text = completion.choices[0]?.message?.content ?? "";
                this.history.push({ role: "assistant", content: text });
                this._setStatus(EngineStatus.READY);
                return text;
            }

            const completion = await this.engine.chat.completions.create({
                messages: this.history,
                temperature: this.options.temperature,
                stream: true,
            });

            let fullText = "";
            for await (const chunk of completion) {
                const delta = chunk.choices[0]?.delta?.content || "";
                if (!delta) continue;
                fullText += delta;
                onChunk?.(delta, fullText);
                this.dispatchEvent(
                    new CustomEvent("chunk", { detail: { delta, fullText } })
                );
            }

            this.history.push({ role: "assistant", content: fullText });
            this._setStatus(EngineStatus.READY);
            return fullText;
        } catch (err) {
            this._fail(err);
            throw err;
        }
    }

    /**
     * Generate a reply from an explicit message list, without touching the
     * engine's internal history. Suited for per-pet conversations: every
     * call passes the full context (system prompt + recent turns).
     *
     * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
     * @param {Object} [opts]
     * @param {boolean} [opts.stream] If true (default) stream the response
     * @param {(delta: string, fullText: string) => void} [opts.onChunk] Per-chunk callback (streaming only)
     * @returns {Promise<string>} Full reply text
     */
    async chat(messages, { stream = true, onChunk } = {}) {
        this._ensureReady();

        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error("chat(): at least one message is required.");
        }

        this._setStatus(EngineStatus.GENERATING);

        try {
            if (!stream) {
                const completion = await this.engine.chat.completions.create({
                    messages,
                    temperature: this.options.temperature,
                });
                const text = completion.choices[0]?.message?.content ?? "";
                this._setStatus(EngineStatus.READY);
                return text;
            }

            const completion = await this.engine.chat.completions.create({
                messages,
                temperature: this.options.temperature,
                stream: true,
            });

            let fullText = "";
            for await (const chunk of completion) {
                const delta = chunk.choices[0]?.delta?.content || "";
                if (!delta) continue;
                fullText += delta;
                onChunk?.(delta, fullText);
                this.dispatchEvent(
                    new CustomEvent("chunk", { detail: { delta, fullText } })
                );
            }

            this._setStatus(EngineStatus.READY);
            return fullText;
        } catch (err) {
            this._fail(err);
            throw err;
        }
    }

    /** Interrupt the current generation, if supported by the underlying engine. */
    async stop() {
        await this.engine?.interruptGenerate?.();
    }

    /** Reset the conversation but keep the model in memory. */
    async reset() {
        this._ensureReady();
        await this.engine.resetChat();
        this.history = [{ role: "system", content: this.options.systemPrompt }];
    }

    /** Unload the model from memory and return the engine to its initial state. */
    async unload() {
        if (this.engine) {
            try { await this.engine.unload?.(); } catch { /* ignore */ }
            this.engine = null;
            this.history = [];
            this._setStatus(EngineStatus.IDLE);
        }
    }

    _ensureReady() {
        if (!this.engine) {
            throw new Error("Engine not initialised: call init() before ask().");
        }
    }

    _setStatus(status) {
        this.status = status;
        this.dispatchEvent(new CustomEvent("statuschange", { detail: status }));
    }

    _fail(err) {
        this._setStatus(EngineStatus.ERROR);
        this.dispatchEvent(new CustomEvent("error", { detail: err }));
    }
}

export default LocalLLMEngine;
