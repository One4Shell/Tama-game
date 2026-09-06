// tools/i18n.js
// Localizzazione dell'interfaccia di Pocket Pet '96.
// Caricato come script classico prima del motore di gioco: espone
// window.TAMA_I18N (e window.t) usati ovunque per tradurre la UI.
(function (global) {
    const SET_LANG_KEY = 'tama.settings.lang';

    const IT = {
        // ---- HTML statico / tooltip ----
        'header.title': 'Generazione · Pet attivo/totale · Trofei · Monete',
        'achTracker.title': 'Trofei sbloccati',
        'coinTracker.title': 'Monete',
        'settingsBtn.title': 'Impostazioni',
        'settingsBtn.aria': 'Impostazioni',
        'stat.food': 'Fame',
        'stat.happy': 'Felicità',
        'stat.energy': 'Energia',
        'stat.hygiene': 'Igiene',
        'stat.health': 'Salute',
        'petNav.prev': 'Pet precedente',
        'petNav.next': 'Pet successivo',
        'modal.title': 'AVVISO',
        'modal.body': 'Messaggio avviso',
        'modal.ok': 'OK',
        'gameOver.subtitle': 'La tua dinastia si è estinta. Nessun pet è rimasto.',
        'gameOver.head': 'STATISTICHE FINALI',
        'gameOver.restart': '▶ Rigioca',
        'gameOver.menu': '⬅ Menu',
        'startScreen.subtitle': 'Pronto per una nuova partita?',
        'startScreen.newGame': '▶ Nuova partita',
        'startScreen.settings': '⚙ Impostazioni',
        'settings.title': 'Impostazioni',
        'settings.close': 'Chiudi',
        'settings.closeAria': 'Chiudi impostazioni',
        'settings.ai': 'AI (modello LLM)',
        'settings.model': 'Modello LLM',
        'settings.lang': 'Lingua',
        'settings.sound': 'Suoni',
        'settings.voice': 'Voce',
        'settings.save': 'Salva',
        'settings.cancel': 'Annulla',
        'hud.downloading': 'Modello in download…',
        'hud.downloadingPct': 'Modello in download… {pct}%',
        'ach.unlocked': 'SBLOCCATO!',

        // ---- Fasi del pet ----
        'stage.EGG': 'UOVO',
        'stage.BABY': 'BEBÈ',
        'stage.ADULT': 'ADULTO',
        'stage.SENIOR': 'ANZIANO',

        // ---- Unità età (albero genealogico) ----
        'unit.day': 'g',
        'unit.hour': 'h',
        'unit.min': 'm',
        'unit.sec': 's',

        // ---- Notifiche di stato ----
        'notif.dead': 'Deceduto!',
        'notif.sick': 'Ammalato!',
        'notif.hungry': 'Ho fame!',
        'notif.clean': 'Pulisci!',
        'notif.sad': 'Triste!',

        // ---- Modali di gioco ----
        'modal.sleeping.title': 'STA DORMENDO',
        'modal.sleeping.body': 'Il pet sta dormendo! Sveglialo prima di fare altre azioni.',
        'modal.noPlay.title': 'IMPOSSIBILE GIOCARE',
        'modal.noPlay.body': 'Il pet è un uovo oppure non ha abbastanza energia!',
        'modal.noCoins.title': 'MONETE INSUFFICIENTI',
        'modal.noCoins.body': 'Servono 80 monete per curare!',
        'modal.healthy.title': 'IN SALUTE',
        'modal.healthy.body': 'Il tuo pet non è ammalato!',
        'modal.eggLaid.title': 'UOVO DEPOSTO!',
        'modal.eggLaid.body': 'Un nuovo uovo è stato aggiunto alla famiglia con tratti ereditati!',
        'modal.departed.title': 'ADDIO',
        'modal.departed.body': '{name} è partito felicemente per il Pianeta Pet, lasciando spazio alle nuove generazioni!{toys}',
        'modal.departed.toys': ' I suoi {count} toy sono andati con lui.',
        'modal.dead.title': 'PET DECEDUTO',
        'modal.dead.body': 'Il tuo pet è morto per negligenza.{toys}',
        'modal.dead.toys': ' I suoi toy sono andati perduti con lui.',
        'modal.win.title': 'VITTORIA!',
        'modal.win.body': 'Hai vinto! Felicità aumentata! +20 monete!',
        'modal.gameAborted.title': 'GIOCO INTERROTTO',
        'modal.gameAborted.body': 'Hai abbandonato il minigioco.',
        'modal.shop.title': 'SHOP',
        'modal.shop.body': 'Nessun pet a cui fare regali!',

        // ---- Negozio ----
        'shop.title': 'SHOP  $ {coins}',
        'shop.exit': 'Esci',
        'shop.snack': 'Snack',
        'shop.toySub': 'toy · -{pct}% calo gioia',
        'shop.snackSub': 'fame +30',
        'shop.exitSub': 'Tocca per uscire',
        'shop.flash.toyAssigned': '{toy} assegnato a {name}!',
        'shop.flash.noCoins': 'Monete insufficienti!',
        'shop.flash.egg': 'È un uovo!',
        'shop.flash.sleeping': 'Sta dormendo!',
        'shop.flash.snackEaten': 'Gnam! Fame +30',
        'toy.BALL': 'Palla',
        'toy.BONE': 'Osso',
        'toy.TEDDY': 'Orsacchiotto',
        'toy.ROBOT': 'Robot',
        'toy.CONSOLE': 'Console',

        // ---- Trofei ----
        'ach.title': 'TROFEI {unlocked}/{total}',
        'ach.HATCH_1.title': 'È Nato!',
        'ach.HATCH_1.desc': 'Schiuso il primo uovo',
        'ach.FEED_10.title': 'Chef Stellato',
        'ach.FEED_10.desc': 'Dai da mangiare 10 volte',
        'ach.WIN_1.title': 'Cacciatore di Stelle',
        'ach.WIN_1.desc': 'Vinci il primo minigioco',
        'ach.WIN_10.title': 'Campione',
        'ach.WIN_10.desc': 'Vinci 10 minigiochi',
        'ach.CLEAN_10.title': 'Mani di Foglia',
        'ach.CLEAN_10.desc': 'Pulisci 10 volte',
        'ach.HEAL_5.title': 'Dottore dei Pet',
        'ach.HEAL_5.desc': 'Cura 5 pet ammalati',
        'ach.PERFECT.title': 'Perfezionista',
        'ach.PERFECT.desc': '5 barre sopra il 95% insieme',
        'ach.BREED_1.title': 'Genitore',
        'ach.BREED_1.desc': 'Deponi il primo uovo',
        'ach.FAMILY_3.title': 'Famiglia Numerosa',
        'ach.FAMILY_3.desc': '3 pet vivi allo stesso tempo',
        'ach.GEN_3.title': 'Dinastia',
        'ach.GEN_3.desc': 'Raggiungi la generazione 3',
        'ach.GEN_5.title': 'Casata Reale',
        'ach.GEN_5.desc': 'Raggiungi la generazione 5',
        'ach.SENIOR_1.title': 'Saggio',
        'ach.SENIOR_1.desc': 'Un pet è diventato Anziano',
        'ach.FAREWELL_1.title': 'Dolce Addio',
        'ach.FAREWELL_1.desc': 'Un pet è partito felice',
        'ach.SPECIES_5.title': 'Collezionista',
        'ach.SPECIES_5.desc': 'Alleva tutte le 5 specie',
        'ach.RAISED_5.title': 'Allevatore Veterano',
        'ach.RAISED_5.desc': '5 pet allevati in totale',

        // ---- Albero genealogico ----
        'tree.title': 'ALBERO GEN MAX {gen} · {pets} PET',
        'tree.genHead': '— GENERAZIONE {gen} —',
        'tree.egg': 'uovo',
        'tree.parent': 'di {name}',
        'tree.founder': 'capostipite',

        // ---- Minigioco ----
        'minigame.stars': 'STELLE: {score} / 5',

        // ---- Statistiche finali (game over) ----
        'go.petsRaised': 'Pet allevati',
        'go.maxGen': 'Generazione max',
        'go.coins': 'Monete',
        'go.trophies': 'Trofei',
        'go.hatched': 'Schiusi',
        'go.laid': 'Depositi',
        'go.meals': 'Pasti',
        'go.cleans': 'Pulizie',
        'go.heals': 'Cure',
        'go.wins': 'Vittorie',
        'go.departed': 'Partiti',
        'go.dead': 'Deceduti',
        'go.species': 'Specie viste',

        // ---- Microfono / STT ----
        'mic.speakNow': '🎤 Parla ora...',
        'mic.unsupported': 'Riconoscimento vocale non supportato',
        'mic.unsupportedBrave': '🗣️ Riconoscimento vocale non disponibile in Brave — usa Chrome o Edge',
        'mic.aiDisabled': 'AI disabilitata: microfono spento',
        'mic.permissionDenied': 'Permesso microfono negato',
        'mic.networkError': '❌ Errore di rete - controlla la connessione',
        'mic.reconnecting': '🔄 Riconnessione... ({attempt}/{max})',

        // ---- Stato modello AI / settings ----
        'model.vram': 'VRAM stimata: {vram}',
        'model.downloading': 'Download in corso…',
        'model.downloadingPct': 'Download in corso… {pct}%',
        'model.ready': 'Modello pronto',
        'model.generating': 'Generazione in corso…',
        'model.notLoaded': 'Modello non caricato',
        'model.aiDisabled': 'AI disattivata: frasi pre-scritte',
        'model.unsupported': 'WebGPU non supportata dal browser',
        'model.error': 'Errore caricamento modello',
        'model.errorDetail': 'Errore caricamento modello: {msg}',
        'model.autoSwitched': 'Passato automaticamente a {label} (il modello iniziale è troppo pesante).',
        'model.autoSwitched2': 'Passato automaticamente a {label} (modello troppo pesante).',
        'model.reloadFailed': 'Ricarica fallita: {msg}'
    };

    const EN = {
        'header.title': 'Generation · Active/total pet · Trophies · Coins',
        'achTracker.title': 'Trophies unlocked',
        'coinTracker.title': 'Coins',
        'settingsBtn.title': 'Settings',
        'settingsBtn.aria': 'Settings',
        'stat.food': 'Hunger',
        'stat.happy': 'Happiness',
        'stat.energy': 'Energy',
        'stat.hygiene': 'Hygiene',
        'stat.health': 'Health',
        'petNav.prev': 'Previous pet',
        'petNav.next': 'Next pet',
        'modal.title': 'NOTICE',
        'modal.body': 'Notice message',
        'modal.ok': 'OK',
        'gameOver.subtitle': 'Your dynasty is extinct. No pets remain.',
        'gameOver.head': 'FINAL STATS',
        'gameOver.restart': '▶ Play again',
        'gameOver.menu': '⬅ Menu',
        'startScreen.subtitle': 'Ready for a new game?',
        'startScreen.newGame': '▶ New game',
        'startScreen.settings': '⚙ Settings',
        'settings.title': 'Settings',
        'settings.close': 'Close',
        'settings.closeAria': 'Close settings',
        'settings.ai': 'AI (LLM model)',
        'settings.model': 'LLM model',
        'settings.lang': 'Language',
        'settings.sound': 'Sounds',
        'settings.voice': 'Voice',
        'settings.save': 'Save',
        'settings.cancel': 'Cancel',
        'hud.downloading': 'Model downloading…',
        'hud.downloadingPct': 'Model downloading… {pct}%',
        'ach.unlocked': 'UNLOCKED!',

        'stage.EGG': 'EGG',
        'stage.BABY': 'BABY',
        'stage.ADULT': 'ADULT',
        'stage.SENIOR': 'SENIOR',

        'unit.day': 'd',
        'unit.hour': 'h',
        'unit.min': 'm',
        'unit.sec': 's',

        'notif.dead': 'Deceased!',
        'notif.sick': 'Sick!',
        'notif.hungry': "I'm hungry!",
        'notif.clean': 'Clean up!',
        'notif.sad': 'Sad!',

        'modal.sleeping.title': 'SLEEPING',
        'modal.sleeping.body': 'The pet is sleeping! Wake it up before doing other actions.',
        'modal.noPlay.title': "CAN'T PLAY",
        'modal.noPlay.body': "The pet is an egg or doesn't have enough energy!",
        'modal.noCoins.title': 'NOT ENOUGH COINS',
        'modal.noCoins.body': 'You need 80 coins to heal!',
        'modal.healthy.title': 'HEALTHY',
        'modal.healthy.body': 'Your pet is not sick!',
        'modal.eggLaid.title': 'EGG LAID!',
        'modal.eggLaid.body': 'A new egg has been added to the family with inherited traits!',
        'modal.departed.title': 'GOODBYE',
        'modal.departed.body': '{name} happily left for Pet Planet, making room for new generations!{toys}',
        'modal.departed.toys': ' Their {count} toys went with him.',
        'modal.dead.title': 'PET DECEASED',
        'modal.dead.body': 'Your pet died from neglect.{toys}',
        'modal.dead.toys': ' Its toys were lost with him.',
        'modal.win.title': 'VICTORY!',
        'modal.win.body': 'You won! Happiness increased! +20 coins!',
        'modal.gameAborted.title': 'GAME ABORTED',
        'modal.gameAborted.body': 'You abandoned the mini-game.',
        'modal.shop.title': 'SHOP',
        'modal.shop.body': 'No pet to give gifts to!',

        'shop.title': 'SHOP  $ {coins}',
        'shop.exit': 'Exit',
        'shop.snack': 'Snack',
        'shop.toySub': 'toy · -{pct}% happiness drain',
        'shop.snackSub': 'hunger +30',
        'shop.exitSub': 'Tap to exit',
        'shop.flash.toyAssigned': '{toy} assigned to {name}!',
        'shop.flash.noCoins': 'Not enough coins!',
        'shop.flash.egg': "It's an egg!",
        'shop.flash.sleeping': 'It is sleeping!',
        'shop.flash.snackEaten': 'Yum! Hunger +30',
        'toy.BALL': 'Ball',
        'toy.BONE': 'Bone',
        'toy.TEDDY': 'Teddy Bear',
        'toy.ROBOT': 'Robot',
        'toy.CONSOLE': 'Console',

        'ach.title': 'TROPHIES {unlocked}/{total}',
        'ach.HATCH_1.title': "It's Born!",
        'ach.HATCH_1.desc': 'Hatched the first egg',
        'ach.FEED_10.title': 'Michelin Chef',
        'ach.FEED_10.desc': 'Feed 10 times',
        'ach.WIN_1.title': 'Star Hunter',
        'ach.WIN_1.desc': 'Win your first mini-game',
        'ach.WIN_10.title': 'Champion',
        'ach.WIN_10.desc': 'Win 10 mini-games',
        'ach.CLEAN_10.title': 'Leaf Hands',
        'ach.CLEAN_10.desc': 'Clean 10 times',
        'ach.HEAL_5.title': 'Pet Doctor',
        'ach.HEAL_5.desc': 'Heal 5 sick pets',
        'ach.PERFECT.title': 'Perfectionist',
        'ach.PERFECT.desc': '5 bars above 95% together',
        'ach.BREED_1.title': 'Parent',
        'ach.BREED_1.desc': 'Lay your first egg',
        'ach.FAMILY_3.title': 'Big Family',
        'ach.FAMILY_3.desc': '3 pets alive at the same time',
        'ach.GEN_3.title': 'Dynasty',
        'ach.GEN_3.desc': 'Reach generation 3',
        'ach.GEN_5.title': 'Royal House',
        'ach.GEN_5.desc': 'Reach generation 5',
        'ach.SENIOR_1.title': 'Wise',
        'ach.SENIOR_1.desc': 'A pet became Senior',
        'ach.FAREWELL_1.title': 'Sweet Goodbye',
        'ach.FAREWELL_1.desc': 'A pet left happily',
        'ach.SPECIES_5.title': 'Collector',
        'ach.SPECIES_5.desc': 'Raise all 5 species',
        'ach.RAISED_5.title': 'Veteran Breeder',
        'ach.RAISED_5.desc': '5 pets raised in total',

        'tree.title': 'TREE MAX GEN {gen} · {pets} PET',
        'tree.genHead': '— GENERATION {gen} —',
        'tree.egg': 'egg',
        'tree.parent': 'of {name}',
        'tree.founder': 'founder',

        'minigame.stars': 'STARS: {score} / 5',

        'go.petsRaised': 'Pets raised',
        'go.maxGen': 'Max generation',
        'go.coins': 'Coins',
        'go.trophies': 'Trophies',
        'go.hatched': 'Hatched',
        'go.laid': 'Eggs laid',
        'go.meals': 'Meals',
        'go.cleans': 'Cleans',
        'go.heals': 'Heals',
        'go.wins': 'Wins',
        'go.departed': 'Departed',
        'go.dead': 'Deceased',
        'go.species': 'Species seen',

        'mic.speakNow': '🎤 Speak now...',
        'mic.unsupported': 'Speech recognition not supported',
        'mic.unsupportedBrave': '🗣️ Speech recognition not available in Brave — use Chrome or Edge',
        'mic.aiDisabled': 'AI disabled: microphone off',
        'mic.permissionDenied': 'Microphone permission denied',
        'mic.networkError': '❌ Network error - check your connection',
        'mic.reconnecting': '🔄 Reconnecting... ({attempt}/{max})',

        'model.vram': 'Estimated VRAM: {vram}',
        'model.downloading': 'Downloading…',
        'model.downloadingPct': 'Downloading… {pct}%',
        'model.ready': 'Model ready',
        'model.generating': 'Generating…',
        'model.notLoaded': 'Model not loaded',
        'model.aiDisabled': 'AI disabled: pre-written phrases',
        'model.unsupported': 'WebGPU not supported by the browser',
        'model.error': 'Model load error',
        'model.errorDetail': 'Model load error: {msg}',
        'model.autoSwitched': 'Auto-switched to {label} (initial model too heavy).',
        'model.autoSwitched2': 'Auto-switched to {label} (model too heavy).',
        'model.reloadFailed': 'Reload failed: {msg}'
    };

    const dicts = { it: IT, en: EN };

    function normalizeLang(lang) {
        const base = String(lang || '').split('-')[0].toLowerCase();
        if (base === 'en') return 'en-US';
        if (base === 'it') return 'it-IT';
        return 'it-IT';
    }

    function detectDefaultLang() {
        try {
            const nav = String(navigator.language || (navigator.languages && navigator.languages[0]) || 'it-IT').split('-')[0].toLowerCase();
            if (nav === 'en') return 'en-US';
            if (nav === 'it') return 'it-IT';
        } catch (e) {}
        return 'it-IT';
    }

    let current = 'it-IT';
    try {
        current = normalizeLang(localStorage.getItem(SET_LANG_KEY) || detectDefaultLang());
    } catch (e) {}

function t(key, vars) {
    const base = current.split('-')[0];
    const dict = dicts[base] || IT;
    let str = (dict[key] != null) ? dict[key] : IT[key];
    if (str == null) str = key;
    if (vars) {
        for (const k in vars) {
            str = String(str).split('{' + k + '}').join(vars[k]);
        }
    }
    return str;
}

    function applyI18n() {
        document.documentElement.lang = current.split('-')[0];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
        });
    }

    function setLang(lang) {
        current = normalizeLang(lang);
        try { localStorage.setItem(SET_LANG_KEY, current); } catch (e) {}
        applyI18n();
    }

    global.TAMA_I18N = {
        t,
        applyI18n,
        setLang,
        getLang: () => current,
        normalizeLang,
        detectDefaultLang
    };
    global.t = t;

    applyI18n();
})(window);