/**
 * speech-recognizer.js
 *
 * Wrapper around the Web Speech API (SpeechRecognition) for in-browser
 * voice recognition. Defaults to English (en-US). Includes microphone
 * enumeration and device selection.
 */

export class SpeechRecognizer extends EventTarget {
    constructor(options = {}) {
        super();
        this.lang = options.lang ?? "en-US";
        this.continuous = options.continuous ?? false;
        this.interimResults = options.interimResults ?? true;

        this.recognition = null;
        this.listening = false;
        this._supported = false;
        this._stream = null;
        /** @type {string|null} Reason the API isn't available (e.g. "brave") */
        this.unsupportedReason = null;

        /** @type {MediaDeviceInfo[]} List of available microphones */
        this.devices = [];
        /** @type {string|null} ID of the selected microphone */
        this.selectedDeviceId = null;

        // Retry logic for network errors
        this._retryCount = 0;
        this._maxRetries = 2;
        this._retryDelay = 1500;

        this._init();
    }

    _init() {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            this._supported = false;
            return;
        }

        // Brave exposes webkitSpeechRecognition but silently blocks it
        // (throws "network" without ever returning transcripts).
        // navigator.brave is a synchronous property unique to Brave.
        if (navigator.brave) {
            this._supported = false;
            this.unsupportedReason = "brave";
            return;
        }

        this._supported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.lang;
        this.recognition.continuous = this.continuous;
        this.recognition.interimResults = this.interimResults;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.trim();
            const isFinal = result.isFinal;

            this.dispatchEvent(
                new CustomEvent("result", {
                    detail: { transcript, isFinal },
                })
            );
        };

        this.recognition.onstart = () => {
            this.listening = true;
            this._retryCount = 0; // Reset retry count on successful start
            this.dispatchEvent(new CustomEvent("start"));
        };

        this.recognition.onend = () => {
            this.listening = false;
            this._retryCount = 0; // Reset retry count on normal end
            this._releaseStream();
            this.dispatchEvent(new CustomEvent("end"));
        };

        this.recognition.onerror = (event) => {
            const errorType = event.error;

            // Retry logic for network errors
            if (errorType === 'network' && this._retryCount < this._maxRetries) {
                this._retryCount++;
                this._releaseStream();
                this.dispatchEvent(
                    new CustomEvent("retry", {
                        detail: { attempt: this._retryCount, maxRetries: this._maxRetries },
                    })
                );
                // Auto-retry after delay
                setTimeout(() => {
                    if (!this.listening) {
                        this.start();
                    }
                }, this._retryDelay);
                return;
            }

            // Reset retry count after max retries or other errors
            this._retryCount = 0;
            this.listening = false;
            this._releaseStream();
            this.dispatchEvent(
                new CustomEvent("error", {
                    detail: { error: errorType, message: this._errorMessage(errorType) },
                })
            );
        };
    }

    isSupported() {
        return this._supported;
    }

    /**
     * Enumera i microfoni disponibili nel sistema.
     * Richiede che sia stato almeno una volta concesso il permesso del microfono.
     *
     * @returns {Promise<MediaDeviceInfo[]>} Lista dei dispositivi audio di input
     */
    async enumerateDevices() {
        try {
            // Prima chiedi il permesso per poter vedere i nomi dei dispositivi
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach((t) => t.stop());

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            this.devices = allDevices.filter((d) => d.kind === "audioinput");
            this.dispatchEvent(new CustomEvent("devicelist", { detail: this.devices }));
            return this.devices;
        } catch {
            this.devices = [];
            return [];
        }
    }

    /**
     * Seleziona un microfono specifico per ID.
     * @param {string|null} deviceId ID del dispositivo (null = default di sistema)
     */
    selectDevice(deviceId) {
        this.selectedDeviceId = deviceId || null;
        localStorage.setItem("tama_mic_device", this.selectedDeviceId || "");
    }

    /**
     * Carica la preferenza del microfono salvata.
     */
    loadSavedDevice() {
        const saved = localStorage.getItem("tama_mic_device");
        if (saved) this.selectedDeviceId = saved;
    }

    /**
     * Ottieni il MediaStream del microfono selezionato.
     * Forza la richiesta di permesso al browser.
     */
    async _acquireStream() {
        const constraints = {
            audio: this.selectedDeviceId
                ? { deviceId: { exact: this.selectedDeviceId } }
                : true,
        };
        this._stream = await navigator.mediaDevices.getUserMedia(constraints);
        return this._stream;
    }

    /**
     * Rilascia il MediaStream corrente.
     */
    _releaseStream() {
        if (this._stream) {
            this._stream.getTracks().forEach((t) => t.stop());
            this._stream = null;
        }
    }

    /**
     * Avvia il riconoscimento vocale.
     * Prima acquisisce il microfono (forza permesso), poi avvia la recognition.
     */
    async start() {
        if (!this._supported || this.listening) return false;

        // Check network connectivity
        if (!navigator.onLine) {
            this.dispatchEvent(
                new CustomEvent("error", {
                    detail: {
                        error: "network",
                        message: "Nessuna connessione internet",
                    },
                })
            );
            return false;
        }

        try {
            // Force the microphone permission prompt
            await this._acquireStream();
        } catch (err) {
            this.dispatchEvent(
                new CustomEvent("error", {
                    detail: {
                        error: "audio-capture",
                        message: err.name === "NotAllowedError"
                            ? "Microphone permission denied"
                            : err.name === "NotFoundError"
                            ? "No microphone found"
                            : `Microphone error: ${err.message}`,
                    },
                })
            );
            return false;
        }

        try {
            this.recognition.start();
            return true;
        } catch {
            this._releaseStream();
            return false;
        }
    }

    stop() {
        if (!this._supported || !this.listening) return;
        try {
            this.recognition.stop();
        } catch {
            // ignore stop errors
        }
    }

    abort() {
        if (!this._supported || !this.listening) return;
        try {
            this.recognition.abort();
        } catch {
            // ignore
        }
    }

    _errorMessage(error) {
        const messages = {
            "no-speech": "No speech detected",
            "audio-capture": "Microphone unavailable",
            "not-allowed": "Microphone permission denied",
            network: "Network error",
            aborted: "Recognition aborted",
            "language-not-supported": "Language not supported",
        };
        return messages[error] || `Error: ${error}`;
    }
}

export default SpeechRecognizer;
