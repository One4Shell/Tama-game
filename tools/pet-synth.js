/**
 * pet-synth.js
 *
 * Wrapper around the Web Speech API (SpeechSynthesis) that gives the pet
 * an English synthetic voice.
 */

export class PetSynth extends EventTarget {
    constructor(options = {}) {
        super();
        this.lang = options.lang ?? "en-US";
        this.rate = options.rate ?? 0.9;
        this.pitch = options.pitch ?? 1.0;
        this.volume = options.volume ?? 1.0;

        this.synth = window.speechSynthesis || null;
        this.voice = null;
        this.speaking = false;
        this._supported = false;
        this._queue = [];

        this._init();
    }

    _init() {
        if (!this.synth) {
            this._supported = false;
            return;
        }
        this._supported = true;
        this._loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this._loadVoices();
        }
    }

    _loadVoices() {
        const voices = this.synth.getVoices();
        // Pick an English voice, preferring en-US/en-GB and female-named voices.
        this.voice =
            voices.find((v) => v.lang.startsWith("en-US") && v.name.toLowerCase().includes("female")) ||
            voices.find((v) => v.lang.startsWith("en-GB") && v.name.toLowerCase().includes("female")) ||
            voices.find((v) => v.lang.startsWith("en-US")) ||
            voices.find((v) => v.lang.startsWith("en-GB")) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0] ||
            null;
    }

    isSupported() {
        return this._supported;
    }

    /**
     * Override the voice profile (pitch/rate) used for the next utterance.
     * The game calls this when switching to a pet whose species has its own
     * tone. Only numeric values provided are applied.
     *
     * @param {Object} [opts]
     * @param {number} [opts.pitch] New pitch (0.1 - 2.0)
     * @param {number} [opts.rate] New rate (0.1 - 10)
     */
    setVoice({ pitch, rate } = {}) {
        if (typeof pitch === "number" && Number.isFinite(pitch)) this.pitch = pitch;
        if (typeof rate === "number" && Number.isFinite(rate)) this.rate = rate;
    }

    /**
     * Speak the supplied text. Cancels anything currently being said.
     * @param {string} text Text to speak
     */
    speak(text) {
        if (!this._supported || !text || text.trim().length === 0) return;

        // Stop anything currently playing
        this.stop();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.lang;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        utterance.volume = this.volume;
        if (this.voice) {
            utterance.voice = this.voice;
        }

        utterance.onstart = () => {
            this.speaking = true;
            this.dispatchEvent(new CustomEvent("start"));
        };

        utterance.onend = () => {
            this.speaking = false;
            this.dispatchEvent(new CustomEvent("end"));
        };

        utterance.onerror = (event) => {
            this.speaking = false;
            this.dispatchEvent(
                new CustomEvent("error", { detail: { error: event.error } })
            );
        };

        this.synth.speak(utterance);
    }

    /**
     * Stop the current utterance and clear the queue.
     */
    stop() {
        if (!this._supported) return;
        this.synth.cancel();
        this.speaking = false;
    }

    /**
     * Pause playback.
     */
    pause() {
        if (this._supported && this.speaking) {
            this.synth.pause();
        }
    }

    /**
     * Resume after a pause.
     */
    resume() {
        if (this._supported && this.synth.paused) {
            this.synth.resume();
        }
    }
}

export default PetSynth;
