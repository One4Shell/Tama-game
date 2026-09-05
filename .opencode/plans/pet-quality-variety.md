# Migliorare qualità risposte + varietà del pet (personalità per specie)

Obiettivo: rendere le risposte del pet più coerenti e varie, e dare a ogni specie
una personalità e una voce distinte. Il pet parla inglese end-to-end (prompt,
TTS, STT); la UI resta in italiano. Nessuna modifica a sprite o salvataggi.

## Stato
- [x] Analisi del codice
- [x] SPECIES_PERSONALITY in pet-ai.js
- [x] System prompt + _cleanResponse migliorati in pet-ai.js
- [x] MOOD_FALLBACKS + notification prompt in pet-ai.js
- [x] setVoice in pet-synth.js
- [x] Integrazione voce per specie + eventi vividi in index.html
- [x] Verifica (sintassi JS OK)

## Modifiche

### 1. tools/pet-ai.js
- Aggiungere export `SPECIES_PERSONALITY` (name + personality + voice {pitch, rate})
  per BLOB, KITTY, DINO, monster, SQUISH.
- `_buildSystemPrompt`: usare SPECIES_PERSONALITY per nome e tratto; migliorare
  il prompt (coerenza, variare aperture, citare ricordi, mood che traspare).
- `_cleanResponse`: tenere fino a 2 frasi, cap ~30 parole.
- Arricchire MOOD_FALLBACKS e migliorare il prompt di generateNotification.
- Aggiungere `getPersonality(speciesId)`.

### 2. tools/pet-synth.js
- Aggiungere `setVoice({ pitch, rate })`.

### 3. index.html
- `applyPetVoice()` che applica pitch/rate della specie al synth; chiamato in
  `switchPet` e `startLiveSpeech`.
- Rendere più vividi i `detail` degli eventi (FEED, CLEAN, HEAL, WAKE, SWITCH,
  SICK, HATCH, PLAY, BREED, GREET).

## Verifica
- Aprire in browser (WebGPU + importmap). Con modello: risposte coerenti e per-specie.
  Senza modello: fallback variati.
- Cambio pet -> pitch/rate della voce cambia.
