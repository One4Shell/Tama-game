// Mappe crepe uovo 16x16 - crepe progressive disegnate sopra la sprite BREED.
// Ogni mappa contiene SOLO i pixel di crepa nuovi ('#' = fessura scura).
// Le mappe vengono rivelate in ordine: il progresso di rottura cresce a ogni tap.
window.TAMA_ART = window.TAMA_ART || {};

(function () {
    // Bracci di crepa in ordine di comparsa (r = riga, c = colonna della griglia 16x16).
    // Il disegno parte dal punto d'impatto in alto al centro e si dirama verso il basso.
    const STROKES = [
        // 1. impatto in alto al centro
        [[1, 7], [1, 8], [2, 7], [2, 8]],
        // 2. fessura verticale verso il basso
        [[3, 7], [3, 8], [4, 7], [4, 8]],
        // 3. la fessura continua
        [[5, 7], [5, 8], [6, 7], [6, 8]],
        // 4. fessura fino a meta uovo
        [[7, 7], [7, 8], [8, 7], [8, 8]],
        // 5. rami laterali superiori
        [[7, 6], [8, 5], [8, 6], [7, 9], [8, 10], [8, 9]],
        // 6. rami inferiori verso il fondo
        [[9, 6], [9, 9], [10, 6], [10, 9], [11, 6], [11, 9], [12, 7], [12, 8]],
        // 7. crepe diagonali sui fianchi
        [[3, 5], [4, 5], [5, 5], [6, 5], [3, 10], [4, 10], [5, 10], [6, 10]],
        // 8. allargamento in alto accanto al punto d'impatto
        [[2, 6], [2, 9], [4, 6], [4, 9]],
        // 9. ragnatela bassa ai lati
        [[9, 4], [10, 4], [11, 4], [9, 11], [10, 11], [11, 11]],
        // 10. foro centrale pronto a cedere
        [[10, 7], [10, 8], [11, 7], [11, 8]]
    ];

    // Maschera della sagoma (riusata dalla sprite BREED se gia' caricata):
    // evita pixel di crepa fuori dal guscio dell'uovo.
    const base = window.TAMA_ART.BREED || null;

    window.TAMA_ART.EGG_CRACKS = STROKES.map(function (cells) {
        const rows = [];
        for (let r = 0; r < 16; r++) rows.push('.'.repeat(16));
        cells.forEach(function (cell) {
            const r = cell[0];
            const c = cell[1];
            if (base) {
                const ch = (base[r] || '')[c];
                if (!ch || ch === '.') return; // fuori dalla sagoma del guscio
            }
            const row = rows[r].split('');
            row[c] = '#';
            rows[r] = row.join('');
        });
        return rows;
    });
})();
