/**
 * pet-memory.js
 *
 * Sistema di memoria per il pet: salva e recupera i ricordi
 * delle conversazioni con l'utente. Ogni pet ha un array di
 * memoria persistente in localStorage.
 */

const MAX_MEMORIES = 100;

export const MemoryCategory = Object.freeze({
    PERSONAL: "personal",
    PREFERENCE: "preference",
    COMMAND: "command",
    CONVERSATION: "conversation",
});

const PERSONAL_PATTERNS = [
    { regex: /mi\s+chiamo\s+(\S+)/i, extract: (m) => `The user's name is ${m[1]}` },
    { regex: /sono\s+(\S+)\s+(\S+)/i, extract: (m) => `The user's name is ${m[1]} ${m[2]}` },
    { regex: /ho\s+(\d+)\s+anni/i, extract: (m) => `The user is ${m[1]} years old` },
    { regex: /vivo\s+a\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user lives in ${m[1].trim()}` },
    { regex: /lavoro\s+(?:a|in|come|da)\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user works ${m[1].trim()}` },
    { regex: /sono\s+(?:un|una)\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user is ${m[1].trim()}` },
];

const PREFERENCE_PATTERNS = [
    { regex: /mi\s+piace\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user likes ${m[1].trim()}` },
    { regex: /adoro\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user loves ${m[1].trim()}` },
    { regex: /mi\s+divert[oi]\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user enjoys ${m[1].trim()}` },
    { regex: /odio\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user dislikes ${m[1].trim()}` },
    { regex: /non\s+mi\s+piace\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user dislikes ${m[1].trim()}` },
    { regex: /mi\s+fa\s+(?:paura|orrore|schifo)\s+(.+?)(?:\.|,|$)/i, extract: (m) => `The user is afraid of ${m[1].trim()}` },
    { regex: /il\s+mio\s+(?:colore|cibo|animale|sport|hobby)\s+(?:preferit[oa]|è)\s+(.+?)(?:\.|,|$)/i, extract: (m) => `User preference: ${m[1].trim()}` },
];

const COMMAND_PATTERNS = [
    { regex: /(?:chiama|nomina|chiama[mt]e)\s+(\S+)/i, extract: (m) => `Command: name ${m[1]}` },
    { regex: /(?:dimmi|raccontami|parlami)\s+(?:di|riguardo)\s+(.+?)(?:\.|,|$)/i, extract: (m) => `Request: talk about ${m[1].trim()}` },
    { regex: /(?:come\s+stai|come\s+ti\s+sent)/i, extract: () => "Request: state of mind" },
];

const STOP_WORDS = new Set([
    "il", "la", "le", "lo", "i", "gli", "un", "una", "uno",
    "di", "del", "della", "dei", "delle", "dello", "degli",
    "a", "al", "alla", "ai", "alle", "allo", "agli",
    "da", "dal", "dalla", "dai", "dalle", "dallo", "dagli",
    "in", "nel", "nella", "nei", "nelle", "nello", "negli",
    "con", "su", "sul", "sulla", "sui", "sulle", "sullo", "sugli",
    "per", "tra", "fra", "che", "chi", "cui",
    "non", "ma", "se", "come", "quando", "dove",
    "io", "tu", "lui", "lei", "noi", "voi", "loro",
    "mio", "tuo", "suo", "nostro", "vostro",
    "questo", "quello", "questa", "quella",
    "è", "sono", "ha", "ho", "hai", "hanno", "essere", "avere",
    "mi", "ti", "ci", "vi", "si", "me", "te",
    "e", "o", "ed", "anche", "già", "ancora", "sempre",
    "molto", "tanto", "poco", "tutto", "niente", "nulla",
    "più", "meno", "bene", "male", "qui", "qua", "là",
]);

function extractKeywords(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\sàèéìòù]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
        .slice(0, 8);
}

export class PetMemory {
    constructor(petId) {
        this.petId = petId;
        this.memories = [];
    }

    addFromUserText(text) {
        if (!text || text.trim().length < 2) return null;

        const trimmed = text.trim();
        let content = trimmed;
        let category = MemoryCategory.CONVERSATION;

        for (const p of PERSONAL_PATTERNS) {
            const match = trimmed.match(p.regex);
            if (match) {
                content = p.extract(match);
                category = MemoryCategory.PERSONAL;
                break;
            }
        }

        if (category === MemoryCategory.CONVERSATION) {
            for (const p of PREFERENCE_PATTERNS) {
                const match = trimmed.match(p.regex);
                if (match) {
                    content = p.extract(match);
                    category = MemoryCategory.PREFERENCE;
                    break;
                }
            }
        }

        if (category === MemoryCategory.CONVERSATION) {
            for (const p of COMMAND_PATTERNS) {
                const match = trimmed.match(p.regex);
                if (match) {
                    content = p.extract(match);
                    category = MemoryCategory.COMMAND;
                    break;
                }
            }
        }

        const memory = {
            content,
            category,
            timestamp: Date.now(),
            keywords: extractKeywords(trimmed),
        };

        this.memories.push(memory);
        while (this.memories.length > MAX_MEMORIES) {
            this.memories.shift();
        }

        return memory;
    }

    addRaw(content, category = MemoryCategory.CONVERSATION) {
        const memory = {
            content,
            category,
            timestamp: Date.now(),
            keywords: extractKeywords(content),
        };
        this.memories.push(memory);
        while (this.memories.length > MAX_MEMORIES) {
            this.memories.shift();
        }
        return memory;
    }

    getRecent(limit = 10, category = null) {
        let pool = this.memories;
        if (category) {
            pool = pool.filter((m) => m.category === category);
        }
        return pool.slice(-limit);
    }

    search(keyword) {
        const kw = keyword.toLowerCase();
        return this.memories.filter(
            (m) =>
                m.content.toLowerCase().includes(kw) ||
                m.keywords.some((k) => k.includes(kw))
        );
    }

    buildMemoryContext() {
        if (this.memories.length === 0) return "";

        const recent = this.getRecent(15);
        const lines = recent.map((m) => {
            const prefix =
                m.category === MemoryCategory.PERSONAL
                    ? "[Personal]"
                    : m.category === MemoryCategory.PREFERENCE
                    ? "[Preference]"
                    : m.category === MemoryCategory.COMMAND
                    ? "[Command]"
                    : "[Conversation]";
            return `${prefix} ${m.content}`;
        });

        return `Memories about the user:\n${lines.join("\n")}`;
    }

    serialize() {
        return this.memories;
    }

    static deserialize(petId, data) {
        const mem = new PetMemory(petId);
        if (Array.isArray(data)) {
            mem.memories = data.filter(
                (m) => m && m.content && m.category && m.timestamp
            );
        }
        return mem;
    }
}

const MAX_RECENT_TURNS = 10;
const MAX_EVENTS = 5;
const TURN_TTL_MS = 30 * 60 * 1000; // i ricordi della conversazione svaniscono dopo 30 min
const EVENT_TTL_MS = 60 * 60 * 1000; // gli eventi restano per un'ora

/**
 * Memoria a breve termine ("coscienza") del pet.
 * Tiene gli ultimi scambi con l'utente e gli eventi appena accaduti,
 * con un decadimento temporale: ciò che è vecchio svanisce da solo.
 */
export class PetShortTermMemory {
    constructor(petId) {
        this.petId = petId;
        this.turns = [];
        this.events = [];
    }

    /** Elimina i ricordi scaduti in base al TTL. */
    prune() {
        const now = Date.now();
        this.turns = this.turns.filter((t) => now - t.ts < TURN_TTL_MS);
        this.events = this.events.filter((e) => now - e.ts < EVENT_TTL_MS);
    }

    addTurn(role, text) {
        if (!text || !text.trim()) return;
        this.prune();
        this.turns.push({ role, text: text.trim(), ts: Date.now() });
        while (this.turns.length > MAX_RECENT_TURNS) {
            this.turns.shift();
        }
    }

    addEvent(type, detail) {
        if (!type || !detail) return;
        this.prune();
        this.events.push({ type, detail, ts: Date.now() });
        while (this.events.length > MAX_EVENTS) {
            this.events.shift();
        }
    }

    getRecentTurns(limit = MAX_RECENT_TURNS) {
        this.prune();
        return this.turns.slice(-limit);
    }

    getRecentEvents(limit = MAX_EVENTS) {
        this.prune();
        return this.events.slice(-limit);
    }

    lastEvent() {
        this.prune();
        return this.events[this.events.length - 1] || null;
    }

    serialize() {
        return { turns: this.turns, events: this.events };
    }

    static deserialize(petId, data) {
        const mem = new PetShortTermMemory(petId);
        if (data) {
            if (Array.isArray(data.turns)) {
                mem.turns = data.turns.filter(
                    (t) => t && t.role && t.text && t.ts
                );
            }
            if (Array.isArray(data.events)) {
                mem.events = data.events.filter(
                    (e) => e && e.type && e.detail && e.ts
                );
            }
        }
        mem.prune();
        return mem;
    }
}

export default PetMemory;
