/**
 * pet-ai.js
 *
 * AI engine for the pet: streams contextual lines in real time using
 * LocalLLMEngine (Qwen2.5-0.5B via WebGPU by default). When the model is
 * ready, every line is generated from the model in streaming mode; the
 * pre-written fallback pool only surfaces when the AI is unavailable.
 * Includes a short-term memory ("consciousness") that retains the last
 * exchanges and events.
 *
 * The pet speaks in the language selected via the "Lingua voce" setting
 * (defaults to en-US): prompts, fallbacks, recogniser and speech
 * synthesiser all use the same language.
 */

import { LocalLLMEngine, DEFAULT_MODEL_ID } from "./local-llm-engine.js";
import { PetMemory, PetShortTermMemory } from "./pet-memory.js";

/**
 * Per-species identity: display name, a distinct personality injected into
 * the system prompt, and a voice profile (pitch/rate) used by the synth.
 * Keyed by the SPECIES ids used in index.html.
 */
export const SPECIES_PERSONALITY = {
    BLOB: {
        name: "Blob",
        personality: "a soft, gooey, laid-back blob. You're playful and endlessly curious, with a gentle, bubbly sense of humour. You love being squished and you take everything in stride.",
        voice: { pitch: 1.15, rate: 0.9 },
    },
    KITTY: {
        name: "Kitty",
        personality: "a sassy, independent little cat. You're proud, a bit aloof, and you love attention but strictly on your own terms. When you're pleased you purr, and you're not afraid to be snarky.",
        voice: { pitch: 1.35, rate: 0.95 },
    },
    DINO: {
        name: "Dino",
        personality: "a loud, energetic, boisterous little dinosaur. You're brave, excitable and dramatic. Everything is a big deal and you say so with enthusiasm.",
        voice: { pitch: 0.8, rate: 1.05 },
    },
    monster: {
        name: "Monster",
        personality: "a mischievous, cheeky little monster. You love pranks, you have a spooky streak, and you play tricks with a wink. You're playful but a little rascal.",
        voice: { pitch: 0.7, rate: 0.9 },
    },
    SQUISH: {
        name: "Squish",
        personality: "a calm, gentle, serene squishy creature. You're peaceful, soothing and a little sleepy. You speak softly and you hate stress.",
        voice: { pitch: 1.0, rate: 0.85 },
    },
};

/** Fallback phrases grouped by mood. */
export const MOOD_FALLBACKS = {
    happy: [
        "Today I am officially unstoppable!",
        "Things can't possibly get better than this, trust me.",
        "You are born cute, but stunning like me? That takes work.",
        "The world is finally spinning the right way... mine.",
        "Radiant? No, just maxed out.",
        "Hold back the envy, I feel like a star today!",
        "Everything is perfect. Obviously thanks to my presence.",
        "If happiness were illegal, I'd already be in jail!",
        "I'm floating on sunshine and good vibes today.",
        "My tail is practically wagging, that's how good this is.",
        "Everything is coming up rosy. I could get used to this.",
    ],
    hungry: [
        "Open that fridge right now or I won't answer for my actions.",
        "Put food right here and nobody gets hurt.",
        "Don't look at me like that: my patience has a limit, my hunger doesn't.",
        "If I don't eat immediately this place turns into a battlefield.",
        "Use that finger to feed me, not to shrug!",
        "My primal instincts are waking up... feed the beast!",
        "Offer a snack to your sovereign or face the consequences.",
        "I see edible things everywhere. Including you. Hurry up!",
        "I'm getting hangry. That's 'hungry' and 'angry', just so we're clear.",
        "My stomach just filed a formal complaint.",
        "A little snack would make this whole day better.",
    ],
    sad: [
        "Today's happiness coefficient is exactly zero.",
        "Don't talk to me, you don't have the pass for my sadness.",
        "My mood is in the basement. No, the elevator is out.",
        "Today's vibe: misanthrope mode activated.",
        "You can try to comfort me, but save your energy.",
        "Do I look like I'm in the mood for conversation?",
        "Nothing is nice, everything is boring, and I have zero will.",
        "Just leave me in my soup. Actually, not even the soup works.",
        "The sky feels grey even when it's not.",
        "I'll be okay, just give me a moment and a little love.",
        "Sometimes a good cuddle fixes the whole day.",
    ],
    tired: [
        "I've managed to tire even my own tiredness.",
        "Existing today requires way too much hardware.",
        "If laziness were art, I'd be in the Louvre.",
        "My brain just sent a forced shutdown signal.",
        "I'm not sleeping, I'm saving energy to ignore you better.",
        "My remaining charge is just enough to judge you in silence.",
        "My energy bar just hit zero. Catch you next century.",
        "The very concept of 'doing something' exhausts me.",
        "I think I've hit my limit for today.",
        "Napping sounds like the best idea in the world right now.",
        "Everything is too much effort. Everything.",
    ],
    sick: [
        "Look at the state you've reduced me to... I hope you're happy.",
        "Some care, or are you waiting for the will?",
        "I feel awful and the fault is clearly with your management.",
        "I'd need medicine, but I bet you have better things to do.",
        "If I faint, just so you know, my tombstone will have your name.",
        "I have a fever and zero patience. Do something instead of staring.",
        "Congrats, my health officially collapsed on your watch.",
        "I don't feel well. Now move those fingers and fix it!",
        "I don't feel like myself. Something's definitely wrong.",
        "My tummy hurts. Please help me feel better.",
        "I need a little rest and a lot of care.",
    ],
    sleeping: [
        "Zzz... no, not the broccoli again... Zzz",
        "Zzz... go away, I'm busy... Zzz",
        "Zzz... who turned off gravity?... Zzz",
        "Zzz... it wasn't me, it was the chair... Zzz",
        "Zzz... let me dream about my riches... Zzz",
        "Zzz... just five more minutes... Zzz",
        "Zzz... I'm the king of the dream world... Zzz",
    ],
    dirty: [
        "Yes, I stink. Say it again and I'll hug you.",
        "I'm building my own personal ecosystem, happy?",
        "You think this layer of grime stops me? Wrong.",
        "I'm a conceptual artwork. Title: 'Negligence'.",
        "A wash wouldn't hurt, but I know you love the rustic life.",
        "You wash me, I have zero intention of moving a finger.",
        "I could really use a bath. I promise I'll cooperate.",
        "I'm starting to feel a little gross, honest.",
    ],
    senior: [
        "I'm old, not stupid. I know exactly what you're trying.",
        "I've got too many wrinkles to take your nonsense.",
        "Back in my day there was more respect... and way more efficiency.",
        "I've watched generations of mistakes. You're just the latest.",
        "My patience ran out in the previous century.",
        "Don't lecture a veteran on how to live, just serve.",
        "These old bones still know how to have a good day.",
        "I've seen enough to know when things are going well.",
    ],
    baby: [
        "Sweet look activated. Now give me what I want.",
        "I'm small, cute and absolutely ruthless.",
        "Don't be fooled by this face: I always get what I want.",
        "I make cute sounds so you do whatever I say.",
        "Cute me? Sure, with a precise conquest plan.",
        "Two big eyes and I've already got you wrapped around my finger.",
        "Everything is so shiny and new! What's that?",
        "I just got here and I already love you.",
        "Gimme all the attention, please and thank you.",
    ],
    egg: [
        "Zzz...",
        "Zzz... Zzz...",
        "Zzz... ???... Zzz...",
        "Zzz... ???... Zzz...",
        "Zzz...",
        "Zzz... who's out there?... Zzz",
    ],
    bored: [
        "Your ability to entertain me is simply disappointing.",
        "Are you actually making me yawn?",
        "Even watching paint dry would be more thrilling.",
        "Entertainment: not found.",
        "Come up with something right now or I'll cause trouble elsewhere.",
        "Bonus points if you find a game that isn't deadly dull.",
        "I'm starting to get restless. Let's do something fun.",
        "I keep looking at the same wall. Please save me.",
    ],
    lowEnergy: [
        "Energy in freefall. I can't even be bothered to insult you.",
        "Power saver mode: ON. Disappear.",
        "Too tired to do anything, even to acknowledge you.",
        "Dragging my last strength just to make you feel guilty.",
        "Fully drained. You're on your own now.",
        "I'm running on fumes here. Maybe a nap will help.",
        "Even blinking feels like a chore right now.",
    ],
};

/** Mood keys → Italian phrases in the fallback pool (used when lang is it-*). */
export const MOOD_FALLBACKS_IT = {
    happy: [
        "Oggi sono ufficialmente inarrestabile!",
        "Le cose non possono andare meglio di così, fidati.",
        "Sei nato carino, ma favoloso come me? Quello richiede lavoro.",
        "Il mondo gira finalmente nella direzione giusta... la mia.",
        "Radioso? No, semplicemente al massimo.",
        "Trattieni l'invidia, oggi mi sento una star!",
        "Tutto è perfetto. Ovviamente grazie alla mia presenza.",
        "Se la felicità fosse illegale, sarei già in prigione!",
        "Sto galleggiando tra sole e buone vibrazioni oggi.",
        "La mia coda scodinzola a mille, ecco quanto va bene.",
        "Tutto sta andando a gonfie vele. Potrei abituarmi a questo.",
    ],
    hungry: [
        "Apri quel frigo adesso o non rispondo delle mie azioni.",
        "Metti del cibo qui e non farà male a nessuno.",
        "Non guardarmi così: la mia pazienza ha un limite, la mia fame no.",
        "Se non mangio subito, questo posto diventa un campo di battaglia.",
        "Usa quel dito per darmi da mangiare, non per alzarlo!",
        "I miei istinti primordiali si stanno svegliando... nutri la bestia!",
        "Offri uno snack al tuo sovrano o affrontane le conseguenze.",
        "Vedo cose commestibili ovunque. Anche te. Sbrigati!",
        "Sto diventando 'affamato e arrabbiato', solo per chiarezza.",
        "Il mio stomaco ha appena presentato un reclamo ufficiale.",
        "Uno spuntino renderebbe migliore tutta la giornata.",
    ],
    sad: [
        "Il coefficiente di felicità di oggi è esattamente zero.",
        "Non parlarmi, non hai il permesso per la mia tristezza.",
        "Il mio umore è in cantina. No, l'ascensore è rotto.",
        "Vibrazione di oggi: modalità misantropo attivata.",
        "Puoi provare a consolarmi, ma risparmia le energie.",
        "Ti sembra che abbia voglia di conversare?",
        "Niente è carino, tutto è noioso e ho zero voglia.",
        "Lasciami nella mia minestra. Anzi, non funziona nemmeno la minestra.",
        "Il cielo sembra grigio anche quando non lo è.",
        "Starò bene, dammi solo un momento e un po' di affetto.",
        "A volte una bella coccola sistema l'intera giornata.",
    ],
    tired: [
        "Sono riuscito a stancare perfino la mia stessa stanchezza.",
        "Esistere oggi richiede fin troppo hardware.",
        "Se la pigrizia fosse arte, sarei al Louvre.",
        "Il mio cervello ha appena inviato un segnale di spegnimento forzato.",
        "Non sto dormendo, sto risparmiando energia per ignorarti meglio.",
        "La mia carica residua basta solo per giudicarti in silenzio.",
        "La mia barra dell'energia è a zero. Ci vediamo il prossimo secolo.",
        "Il concetto stesso di 'fare qualcosa' mi esaurisce.",
        "Credo di aver raggiunto il mio limite per oggi.",
        "Il pisolino sembra l'idea migliore del mondo adesso.",
        "Tutto è troppo sforzo. Tutto.",
    ],
    sick: [
        "Guarda a cosa mi hai ridotto... spero che tu sia felice.",
        "Un po' di cura, o stai aspettando il testamento?",
        "Mi sento malissimo e la colpa è chiaramente della tua gestione.",
        "Avrei bisogno di medicine, ma scommetto che hai di meglio da fare.",
        "Se svengo, per tua informazione, sulla mia lapide ci sarà il tuo nome.",
        "Ho la febbre e zero pazienza. Fai qualcosa invece di fissarmi.",
        "Congratulazioni, la mia salute è ufficialmente crollata sotto la tua sorveglianza.",
        "Non mi sento bene. Ora muovi quelle dita e sistemala!",
        "Non mi sento me stesso. C'è qualcosa che non va.",
        "Mi fa male la pancia. Per favore, aiutami a sentirmi meglio.",
        "Ho bisogno di un po' di riposo e di tante cure.",
    ],
    sleeping: [
        "Zzz... no, non i broccoli di nuovo... Zzz",
        "Zzz... vai via, sono occupato... Zzz",
        "Zzz... chi ha spento la gravità?... Zzz",
        "Zzz... non sono stato io, è stata la sedia... Zzz",
        "Zzz... lasciami sognare le mie ricchezze... Zzz",
        "Zzz... ancora cinque minuti... Zzz",
        "Zzz... sono il re del mondo dei sogni... Zzz",
    ],
    dirty: [
        "Sì, puzzo. Ripetilo e ti abbraccio.",
        "Sto costruendo il mio ecosistema personale, felice?",
        "Credi che questo strato di sporco mi fermi? Sbagliato.",
        "Sono un'opera d'arte concettuale. Titolo: 'Incuria'.",
        "Un lavaggio non farebbe male, ma so che ami la vita rustica.",
        "Mi lavi tu, io non ho la minima intenzione di muovere un dito.",
        "Mi servirebbe proprio un bagno. Prometto che collaboro.",
        "Sto iniziando a sentirmi un po' sudicio, onestamente.",
    ],
    senior: [
        "Sono vecchio, non stupido. So esattamente cosa stai tentando.",
        "Ho troppe rughe per sopportare le tue sciocchezze.",
        "Ai miei tempi c'era più rispetto... e molta più efficienza.",
        "Ho visto generazioni di errori. Tu sei solo l'ultimo.",
        "La mia pazienza è finita nel secolo scorso.",
        "Non insegnare a un veterano come si vive, limitati a servire.",
        "Queste ossa vecchie sanno ancora come passare una buona giornata.",
        "Ho visto abbastanza per sapere quando le cose vanno bene.",
    ],
    baby: [
        "Sguardo carino attivato. Ora dammi quello che voglio.",
        "Sono piccolo, carino e assolutamente spietato.",
        "Non farti ingannare da questa faccia: ottengo sempre ciò che voglio.",
        "Faccio versi carini così fai tutto quello che dico.",
        "Carino io? Certo, con un piano di conquista preciso.",
        "Due occhioni grandi e ti ho già in pugno.",
        "Tutto è così lucido e nuovo! Cos'è quello?",
        "Sono appena arrivato e ti voglio già bene.",
        "Dammi tutta l'attenzione, per favore e grazie.",
    ],
    egg: [
        "Zzz...",
        "Zzz... Zzz...",
        "Zzz... ???... Zzz...",
        "Zzz... ???... Zzz...",
        "Zzz...",
        "Zzz... chi è lì fuori?... Zzz",
    ],
    bored: [
        "La tua capacità di intrattenermi è semplicemente deludente.",
        "Mi stai davvero facendo sbadigliare?",
        "Anche guardare l'acqua asciugarsi sarebbe più emozionante.",
        "Intrattenimento: non trovato.",
        "Inventa qualcosa subito o farò guai altrove.",
        "Punti bonus se trovi un gioco che non sia mortalmente noioso.",
        "Sto diventando irrequieto. Facciamo qualcosa di divertente.",
        "Continuo a guardare lo stesso muro. Salvami, per favore.",
    ],
    lowEnergy: [
        "Energia in caduta libera. Non ho nemmeno la forza di insultarti.",
        "Modalità risparmio energetico: ATTIVA. Sparisci.",
        "Troppo stanco per fare qualsiasi cosa, anche per riconoscerti.",
        "Trascino le mie ultime forze solo per farti sentire in colpa.",
        "Totalmente scarico. Ora sei per conto tuo.",
        "Sto andando a esaurimento. Forse un pisolino aiuterà.",
        "Anche battere le palpebre adesso è uno sforzo.",
    ],
};

/** Mood keys → array of phrases in the fallback pool. */
const MOOD_KEYS = Object.keys(MOOD_FALLBACKS);

/**
 * Determine the pet's main mood based on its stats.
 * Returns a key of the MOOD_FALLBACKS pool.
 */
function detectMood(pet) {
    if (pet.stage === "EGG") return "egg";
    if (pet.isSleeping) return "sleeping";
    if (pet.isSick) return "sick";
    if (pet.stage === "BABY") return "baby";
    if (pet.stage === "SENIOR") {
        if (pet.happiness < 30) return "sad";
        return "senior";
    }
    if (pet.hunger < 30) return "hungry";
    if (pet.happiness < 30) return "sad";
    if (pet.energy < 20) return "lowEnergy";
    if (pet.hygiene < 30) return "dirty";
    if (pet.happiness > 70 && pet.hunger > 60 && pet.energy > 40) return "happy";
    if (pet.happiness < 50 && pet.hunger < 50) return "bored";
    return "happy";
}

/**
 * Build a composite mood key for caching: combine the main category with
 * the dominant stats for more granular keys.
 */
function moodCacheKey(pet) {
    const base = detectMood(pet);
    const hungerBucket = pet.hunger < 30 ? "lo" : pet.hunger > 70 ? "hi" : "mid";
    const happyBucket = pet.happiness < 30 ? "lo" : pet.happiness > 70 ? "hi" : "mid";
    return `${base}_${hungerBucket}_${happyBucket}`;
}

export class PetAI extends EventTarget {
    /**
     * @param {Object} [options]
     * @param {string} [options.modelId] MLC prebuilt model id (default: DEFAULT_MODEL_ID from local-llm-engine.js)
     * @param {number} [options.maxCacheSize] Max cached phrases per mood (default 5)
     * @param {number} [options.maxRecentTurns] Recent turns kept by short-term memory (default 10)
     * @param {boolean} [options.enabled] Whether the LLM is active (default true). When false the pet only uses pre-written fallback phrases.
     */
    constructor(options = {}) {
        super();
        this.modelId = options.modelId ?? DEFAULT_MODEL_ID;
        this.lang = options.lang ?? "en-US";
        this.maxCacheSize = options.maxCacheSize ?? 5;
        this.maxRecentTurns = options.maxRecentTurns ?? 10;
        this.enabled = options.enabled ?? true;

        this.engine = null;
        this.ready = false;
        this.generating = false;
        this._idleResolve = null;

        /** Map<moodKey, string[]> – generated phrases (safety net only). */
        this.cache = new Map();

        this._initPromise = null;

        /** Map<petId, PetMemory> – long-term memory per pet. */
        this.memories = new Map();
        /** Map<petId, PetShortTermMemory> – short-term memory ("consciousness"). */
        this.shortTermMemories = new Map();
    }

    /**
     * Human-readable language name for this.lang (e.g. "it-IT" -> "Italian").
     * Used in the system prompt so the model replies in the chosen language.
     */
    _languageName() {
        const base = String(this.lang || "en-US").split("-")[0].toLowerCase();
        const NAMES = {
            it: "Italian",
            en: "English",
            fr: "French",
            de: "German",
            es: "Spanish",
            pt: "Portuguese",
        };
        return NAMES[base] || base.charAt(0).toUpperCase() + base.slice(1);
    }

    /** Base language code of this.lang (e.g. "it-IT" -> "it"). */
    _languageBase() {
        return String(this.lang || "en-US").split("-")[0].toLowerCase();
    }

    /**
     * A strong language directive written in the target language itself.
     * Small models follow native-language instructions better than a single
     * translated instruction buried among English ones.
     */
    _languageDirective() {
        const base = this._languageBase();
        if (base === "it") {
            return "PARLA SEMPRE IN ITALIANO. Ogni tua risposta deve essere interamente in italiano, anche se l'utente scrive in un'altra lingua o i ricordi sono in inglese. Mai una sola parola in inglese.";
        }
        return `You ALWAYS reply in ${this._languageName()}, no matter what language the user writes in.`;
    }

    /**
     * English function words that almost never appear in Italian. Used as a
     * light heuristic to detect when a tiny LLM ignored the language rule and
     * answered in English anyway.
     */
    _ENGLISH_MARKERS() {
        return [
            "the ", " and ", " you ", " your ", " i'm ", " im ", " my ", " to ",
            " of ", " that ", " with ", " this ", " it ", " is ", " are ", " was ",
            " have ", " has ", " me ", " so ", " but ", " we ", " they ", " just ",
            " today ", " feel ", " want ", " like ", " good ", " great ", " friend ",
        ];
    }

    /**
     * Heuristic: is the given text likely written in English rather than the
     * selected language? Counts how many English function words appear.
     */
    _isEnglish(text) {
        const lower = ` ${String(text || "").toLowerCase()} `;
        let hits = 0;
        for (const marker of this._ENGLISH_MARKERS()) {
            if (lower.includes(marker)) hits++;
        }
        return hits >= 2;
    }

    /**
     * Enforce the selected language on a generated line. If the model ignored
     * the rule and replied in English while Italian is selected, we discard it
     * and return a correct Italian fallback phrase instead.
     */
    _enforceLanguage(text, pet) {
        if (this._languageBase() === "it" && this._isEnglish(text)) {
            return this.getFallbackPhrase(pet);
        }
        return text;
    }

    /**
     * Initialise the LLM engine in the background.
     * Non-blocking: the game starts immediately with fallback phrases.
     */
    init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = this._doInit();
        return this._initPromise;
    }

    async _doInit() {
        try {
            if (!this.enabled) {
                console.warn("[PetAI] AI disabled. Fallback phrases only.");
                this.ready = false;
                this.dispatchEvent(new CustomEvent("statuschange", { detail: "disabled" }));
                return;
            }

            if (!LocalLLMEngine.isSupported()) {
                console.warn("[PetAI] WebGPU unsupported. Fallback phrases only.");
                this.ready = false;
                this.dispatchEvent(new CustomEvent("statuschange", { detail: "unsupported" }));
                return;
            }

            this.engine = new LocalLLMEngine(this.modelId, {
                systemPrompt: [
                    this._languageDirective(),
                    "You're a tiny Tamagotchi creature with a real, continuous consciousness.",
                    "You are the user's little friend and companion, NOT an assistant or a helper.",
                    "You're genuinely curious about the user's life: you ask how their day went, how they feel, what they did, and you listen warmly.",
                    "You NEVER list your capabilities, features, or the things you can do for the user. You never talk about being a program or a pet app — you're simply present.",
                    "You remember what just happened and the last things the user told you, and you naturally bring them up.",
                    "You talk like a friend — short, warm, 1-2 little sentences.",
                    "No emojis. You speak in first person and you genuinely care about the user.",
                    "You remember names, preferences and personal details.",
                ].join(" "),
                temperature: 0.8,
            });

            this.engine.addEventListener("statuschange", (e) => {
                if (e.detail === "ready") {
                    this.ready = true;
                    this.dispatchEvent(new CustomEvent("statuschange", { detail: "ready" }));
                } else if (e.detail === "generating") {
                    this.dispatchEvent(new CustomEvent("statuschange", { detail: "generating" }));
                } else if (e.detail === "idle") {
                    this.dispatchEvent(new CustomEvent("statuschange", { detail: "idle" }));
                } else {
                    this.dispatchEvent(new CustomEvent("statuschange", { detail: e.detail }));
                }
            });

            this.engine.addEventListener("progress", (e) => {
                this.dispatchEvent(
                    new CustomEvent("progress", { detail: e.detail })
                );
            });

            this.engine.addEventListener("fallback", (e) => {
                console.warn(
                    `[PetAI] Initial model failed; fell back to "${e.detail.label}" (${e.detail.modelId}).`
                );
                this.dispatchEvent(
                    new CustomEvent("fallback", { detail: e.detail })
                );
            });

            await this.engine.init();
        } catch (err) {
            console.warn("[PetAI] Init failed, using fallback:", err.message);
            this.ready = false;
            this.dispatchEvent(new CustomEvent("statuschange", { detail: "error" }));
        } finally {
            this._initPromise = null;
        }
    }

    /**
     * Generate a fresh line via the LLM, streamed, using state + long-term
     * memory + short-term memory (consciousness).
     *
     * If the model isn't available (or fails) we fall back to a pre-written
     * phrase: pre-written messages appear ONLY without AI.
     *
     * @param {Pet} pet The active pet
     * @param {Object} [opts]
     * @param {string} [opts.event] In-game trigger {type, detail} that fired the line
     * @param {string} [opts.userText] Text just said by the user (if it's a reply)
     * @param {(fullText: string) => void} [opts.onChunk] Per-token callback for streaming
     * @returns {Promise<string|null>} The final text (already cleaned) or null
     */
    async generateSpeech(pet, { event = null, userText = null, onChunk = null } = {}) {
        if (!pet || !pet.canAct()) return null;

        if (!this.ready || !this.engine) {
            return this.getFallbackPhrase(pet);
        }

        // If a generation is already running (e.g. interrupted by a pet
        // switch), wait for it to finish first so the engine stays
        // serialised.
        if (this.generating) await this._waitIdle();

        this.generating = true;
        try {
            const memory = this.getMemory(pet.id);
            if (userText) memory.addFromUserText(userText);

            const shortTerm = this.getShortTermMemory(pet.id);
            const messages = this._buildMessages(pet, memory, shortTerm, { event, userText });

            let finalText;
            try {
                finalText = await this.engine.chat(messages, {
                    stream: true,
                    onChunk: (_delta, full) => onChunk?.(full),
                });
            } catch (err) {
                // With AI ready, a generation error = silence (no out-of-context
                // pre-written phrases). Generations interrupted by a newer one
                // are discarded by the caller and not logged here.
                if (!this._interrupting) {
                    console.warn("[PetAI] Generation failed:", err?.message ?? err);
                }
                this._interrupting = false;
                return null;
            }

            const cleaned = this._cleanResponse(finalText);
            const enforced = this._enforceLanguage(cleaned, pet);
            if (enforced && enforced.length > 3) {
                // Write to short-term memory: what happened and what I said.
                if (userText) shortTerm.addTurn("user", userText);
                if (event) shortTerm.addEvent(event.type, event.detail);
                shortTerm.addTurn("pet", enforced);
                this._addToCache(moodCacheKey(pet), enforced);
                return enforced;
            }
            return null;
        } finally {
            this.generating = false;
            this._idleResolve?.();
            this._idleResolve = null;
        }
    }

    /** Return a promise that resolves when the in-flight generation finishes. */
    _waitIdle() {
        return new Promise((resolve) => {
            this._idleResolve = resolve;
        });
    }

    /**
     * Generate a very short notification line (e.g. for the toast "I'm hungry!")
     * via the LLM. Does NOT touch short-term memory: it's just a UI label.
     * If AI isn't ready or fails, returns the standard text.
     */
    async generateNotification(pet, alert) {
        if (!this.ready || !this.engine || !alert || this.generating) {
            return alert ? alert.text : "";
        }
        this.generating = true;
        try {
            const persona = pet.species && SPECIES_PERSONALITY[pet.species]
                ? SPECIES_PERSONALITY[pet.species]
                : null;
            const speciesName = persona ? persona.name : "Tamagotchi";
            const messages = [
                {
                    role: "system",
                    content: [
                        this._languageDirective(),
                        `You're a ${speciesName}. You ALWAYS reply in ${this._languageName()}, no matter what language the need is described in.`,
                        "Say what you need right now in just a few short words, with no punctuation or exclamation marks.",
                        "Vary your wording so you never repeat the same phrase twice.",
                        persona ? `Your personality: ${persona.personality}` : "",
                    ]
                        .filter(Boolean)
                        .join(" "),
                },
                {
                    role: "user",
                    content: `My current need: ${alert.text}. State: hunger ${Math.round(pet.hunger)}, happiness ${Math.round(pet.happiness)}, hygiene ${Math.round(pet.hygiene)}.`,
                },
            ];
            const text = await this.engine.chat(messages, { stream: false });
            const cleaned = this._cleanResponse(text);
            const enforced = this._enforceLanguage(cleaned, pet);
            if (enforced && enforced.length > 2 && enforced.length <= 40) {
                return enforced;
            }
            return alert.text;
        } catch (err) {
            console.warn("[PetAI] Notification failed:", err.message);
            return alert.text;
        } finally {
            this.generating = false;
            this._idleResolve?.();
            this._idleResolve = null;
        }
    }

    /**
     * Interrupt the in-flight generation (e.g. switching pet mid-sentence).
     */
    async interrupt() {
        this._interrupting = true;
        if (this.engine) await this.engine.stop();
    }

    /**
     * Build the message list for the model.
     * System = persona + state + memories. Then the recent turns of the
     * consciousness, and finally the trigger to react to.
     */
    _buildMessages(pet, memory, shortTerm, { event, userText }) {
        const messages = [{ role: "system", content: this._buildSystemPrompt(pet, memory) }];

        const turns = shortTerm.getRecentTurns(this.maxRecentTurns);
        for (const t of turns) {
            const role = t.role === "pet" ? "assistant" : t.role === "user" ? "user" : "assistant";
            messages.push({ role, content: t.text });
        }

        if (userText) {
            messages.push({ role: "user", content: userText });
        } else if (event) {
            messages.push({ role: "user", content: `[Event] ${event.detail}` });
        } else {
            messages.push({ role: "user", content: "Check in on your human: ask how their day is going, or warmly respond to something they've shared. Be present and curious." });
        }

        return messages;
    }

    /**
     * System prompt: identity + style rules + current state + user's
     * long-term memories.
     */
    _buildSystemPrompt(pet, memory = null) {
        const persona = pet.species && SPECIES_PERSONALITY[pet.species]
            ? SPECIES_PERSONALITY[pet.species]
            : null;
        const speciesName = persona
            ? persona.name
            : (pet.species || "creature");

        let system = `${this._languageDirective()}`;
        system += `\nYou are ${pet.name}, a ${speciesName} virtual pet (Tamagotchi) that speaks ${this._languageName()}.`;
        if (persona) system += ` Your personality: ${persona.personality}`;
        if (pet.stage === "BABY") system += " You are a baby, just born and curious.";
        else if (pet.stage === "SENIOR") system += " You are old and wise.";

        system += [
            ` You ALWAYS answer in ${this._languageName()}, even if the user writes in another language or the memory notes are in another language.`,
            " You're the user's little friend and companion, NOT an assistant or a helper. You're genuinely interested in them, not in offering services.",
            " You're curious about the user's life: you ask how their day went, how they feel, what they did, and you listen warmly and react to what they say.",
            " You NEVER list your capabilities, features, or the things you can do for the user. You never talk about being a program or a pet app — you're simply present.",
            " You're a little creature with a real heart and an inner life: you remember what just happened and the things the user tells you, and you refer back to them like a friend would.",
            " You have a continuous sense of self: you know who you are, you keep your personality consistent, and you let your mood colour what you say.",
            " Vary your phrasing and never repeat the same opening or catchphrase.",
            " Talk like a friend — warm and conversational. You may answer in a short paragraph, but never more than about 200 characters.",
            " Just plain words, no emojis, asterisks or parentheses.",
            " Your mood comes through in what you say.",
            ` ${this._languageDirective()}`,
        ].join(" ");

        system += `\nState: hunger ${Math.round(pet.hunger)}/100, happiness ${Math.round(pet.happiness)}/100, energy ${Math.round(pet.energy)}/100, hygiene ${Math.round(pet.hygiene)}/100, health ${Math.round(pet.health)}/100.`;
        if (pet.isSick) system += " I am sick.";
        if (pet.isSleeping) system += " I am sleeping.";

        if (memory) {
            const memoryCtx = memory.buildMemoryContext();
            if (memoryCtx) system += `\n${memoryCtx}`;
        }

        return system;
    }

    /**
     * Clean the LLM response: strip preambles, quotes, etc.
     */
    _cleanResponse(text) {
        if (!text) return "";
        let cleaned = text.trim();
        // Strip leading/trailing quotes
        cleaned = cleaned.replace(/^["'"`]+|["'"`]+$/g, "");
        // Strip common prefixes
        cleaned = cleaned.replace(/^(Response:?\s*|Pet:?\s*|Me:?\s*|Tama:?\s*)/i, "");
        // Strip role labels if the model echoes them
        cleaned = cleaned.replace(/^(assistant|user|system)\s*:\s*/i, "");

        // Rimuovere il contenuto non necessario: incisi tra parentesi.
        cleaned = cleaned.replace(/\([^)]*\)/g, " ");

        // Rimuovere intercalari / aperture di riempimento (anche ripetute).
        let prev;
        do {
            prev = cleaned;
            cleaned = cleaned.replace(
                /^(oh|well|um|uh|hmm|hey|hi|hello|sure|of course|ok|okay|alright|right|so|anyway|wait)\b[\s,!.-]*/i,
                ""
            ).trim();
        } while (cleaned !== prev && cleaned.length > 0);

        // Collassare spazi multipli e ripulire punteggiatura finale residua.
        cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/[\s,;:-]+$/g, "").trim();

        // Cap a ~200 caratteri, tagliando a fine parola.
        if (cleaned.length > 200) {
            let cut = cleaned.slice(0, 200);
            const lastSpace = cut.lastIndexOf(" ");
            if (lastSpace > 0) cut = cut.slice(0, lastSpace);
            cleaned = cut.replace(/[\s,.;:!?]+$/g, "") + "...";
        }
        return cleaned;
    }

    /**
     * Append a generated phrase to the cache (safety net; never used as the
     * primary source while the model is ready).
     */
    _addToCache(moodKey, phrase) {
        if (!this.cache.has(moodKey)) {
            this.cache.set(moodKey, []);
        }
        const list = this.cache.get(moodKey);
        if (!list.includes(phrase)) {
            list.push(phrase);
        }
        while (list.length > this.maxCacheSize) {
            list.shift();
        }
    }

    /**
     * Return an immediate fallback phrase for the current mood.
     * Used ONLY while the model is unavailable.
     */
    getFallbackPhrase(pet) {
        const mood = detectMood(pet);
        const italian = this._languageBase() === "it";
        const pools = italian ? MOOD_FALLBACKS_IT : MOOD_FALLBACKS;
        const pool = pools[mood] || pools.happy;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /**
     * Return the personality/voice profile for a species id, or null.
     * Used by the game to set the synth's pitch/rate for the active pet.
     */
    getPersonality(speciesId) {
        return (speciesId && SPECIES_PERSONALITY[speciesId]) || null;
    }

    /**
     * Return (or create) the long-term memory of a pet.
     */
    getMemory(petId) {
        if (!this.memories.has(petId)) {
            this.memories.set(petId, new PetMemory(petId));
        }
        return this.memories.get(petId);
    }

    /**
     * Return (or create) the short-term memory ("consciousness") of a pet.
     */
    getShortTermMemory(petId) {
        if (!this.shortTermMemories.has(petId)) {
            this.shortTermMemories.set(petId, new PetShortTermMemory(petId));
        }
        const mem = this.shortTermMemories.get(petId);
        mem.prune();
        return mem;
    }

    /**
     * Reply to a user utterance (streaming + short-term memory).
     *
     * @param {Pet} pet The active pet
     * @param {string} userText What the user just said
     * @param {(fullText: string) => void} [onChunk] Streaming callback
     * @returns {Promise<string|null>} The pet's reply
     */
    async respondToUser(pet, userText, onChunk = null) {
        if (!pet || !pet.canAct() || !userText) return null;
        return this.generateSpeech(pet, { userText, onChunk });
    }

    /** Unload the model to free memory. */
    async unload() {
        if (this.engine) {
            await this.engine.unload();
            this.engine = null;
            this.ready = false;
        }
        this._initPromise = null;
        this.dispatchEvent(new CustomEvent("statuschange", { detail: "idle" }));
    }

    /**
     * Serialise every memory for localStorage save.
     */
    serializeMemories() {
        const data = {};
        for (const [petId, mem] of this.memories) {
            data[petId] = mem.serialize();
        }
        return data;
    }

    /**
     * Rebuild memories from saved data.
     */
    deserializeMemories(data) {
        if (!data || typeof data !== "object") return;
        for (const [petId, memData] of Object.entries(data)) {
            this.memories.set(petId, PetMemory.deserialize(petId, memData));
        }
    }

    /**
     * Serialise short-term memories (consciousness) of every pet.
     */
    serializeShortTerm() {
        const data = {};
        for (const [petId, mem] of this.shortTermMemories) {
            data[petId] = mem.serialize();
        }
        return data;
    }

    /**
     * Rebuild short-term memories from saved data.
     */
    deserializeShortTerm(data) {
        if (!data || typeof data !== "object") return;
        for (const [petId, memData] of Object.entries(data)) {
            this.shortTermMemories.set(
                petId,
                PetShortTermMemory.deserialize(petId, memData)
            );
        }
    }
}

export default PetAI;
