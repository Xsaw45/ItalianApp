/**
 * Internationalization module.
 * Supports Italian (it) and French (fr) UI languages.
 */
import { getSettings, updateSettings } from './state.js';

const TRANSLATIONS = {
  it: {
    // Navigation
    'nav.home': 'Home',
    'nav.stats': 'Statistiche',
    'nav.vocab': 'A-Z Vocabolario',
    'nav.conj': 'Coniugazione',
    'sidebar.error': 'Errore nel caricamento del menu.',

    // App header
    'app.title': 'Grammatica Italiana',
    'app.init.error': "Errore nell'inizializzazione dell'app: ",

    // Home
    'home.welcome': 'Benvenuto!',
    'home.subtitle': 'Studia la grammatica italiana con esercizi interattivi.',
    'home.continue.title': 'Continua dove eri rimasto',
    'home.continue.subtitle': 'Fiche {id}: {title}',
    'home.continue.btn': 'Continua',
    'home.stat.completed': 'Schede completate',
    'home.stat.total': 'Schede totali',
    'home.stat.progress': 'Progresso',
    'home.topics': 'Argomenti',
    'home.all': 'Tutte le schede',
    'home.cat.count': '{n} schede \u2022 {c} completate',
    'home.error': 'Errore nel caricamento: ',
    'home.scheda.prefix': 'Scheda',

    // Scheda view
    'scheda.loading': 'Caricamento...',
    'scheda.not.found': 'Scheda "{id}" non trovata.',
    'scheda.prefix': 'Scheda',
    'scheda.tab.theory': 'Teoria',
    'scheda.tab.exercises': 'Esercizi',
    'scheda.prev': '\u2190 Scheda {id}',
    'scheda.next': 'Scheda {id} \u2192',
    'scheda.go.exercises': 'Vai agli esercizi \u2192',
    'scheda.unavailable.title': 'Scheda non ancora disponibile',
    'scheda.unavailable.body': 'Il contenuto della Scheda {id} non è ancora stato digitalizzato.',
    'scheda.back.home': 'Torna alla home',

    // Stats view
    'stats.title': 'Statistiche',
    'stats.global.score': 'Punteggio globale',
    'stats.questions': 'Domande risposte',
    'stats.completed': 'Schede completate',
    'stats.attempts': 'Tentativi totali',
    'stats.per.topic': 'Per argomento',
    'stats.to.review': 'Da rivedere',
    'stats.retry': 'Riprova \u2192',
    'stats.cat.count': '{c}/{n} schede',
    'stats.empty': 'Nessun esercizio ancora completato. Inizia a studiare!',
    'stats.error': 'Errore: ',

    // Vocab view
    'vocab.title': 'Vocabolario',
    'vocab.tab.list': 'Lista',
    'vocab.tab.quiz': 'Pratica',
    'vocab.stat.mastered': 'Parole\napprese',
    'vocab.stat.seen': 'Parole\nviste',
    'vocab.stat.learn': 'Da\nimparare',
    'vocab.quiz.desc': 'Il test comprende {n} domande casuali. Per ogni parola devi scrivere la traduzione (italiano \u2194 francese). Ogni risposta corretta vale 1 punto.',
    'vocab.quiz.start': 'Inizia il test',
    'vocab.question': 'Domanda {i} / {n}',
    'vocab.dir.itfr': 'Italiano \u2192 Francese',
    'vocab.dir.frit': 'Francese \u2192 Italiano',
    'vocab.placeholder': 'Scrivi la traduzione...',
    'vocab.confirm': 'Conferma',
    'vocab.next': 'Avanti \u2192',
    'vocab.correct': '\u2714 Corretto!',
    'vocab.wrong': '\u2716 Risposta corretta: ',
    'vocab.result.pct': '% di risposte corrette',
    'vocab.to.review': 'Da rivedere',
    'vocab.perfect': 'Perfetto! Tutte le risposte sono corrette!',
    'vocab.retry': 'Riprova',
    'vocab.error': 'Errore: ',
    // Levels & spaced repetition
    'vocab.level.all': 'Tutti i livelli',
    'vocab.level.prefix': 'Livello',
    'vocab.locked': 'Bloccato',
    'vocab.unlock.need': '{n} parole per sbloccare il livello {l}',
    'vocab.unlock.pct': '75% richiesto',
    'vocab.due.badge': 'Da rivedere: {n}',
    'vocab.status.new': 'Nuovo',
    'vocab.status.learning': 'In corso',
    'vocab.status.cooldown': 'Pausa {n}g',
    'vocab.status.due': 'Da rivedere',
    'vocab.status.archived': 'Archiviato',
    'vocab.quiz.level.badge': 'N{n}',
    'vocab.level.progress': '{done}/{total} parole — {pct}%',
    'vocab.unlock.congrats': 'Livello {n} sbloccato!',
    'vocab.pool.empty': 'Nessuna parola disponibile. Tutte le parole sono in pausa o archiviate.',

    // Conjugation view
    'conj.title': 'Coniugazione',
    'conj.tab.list': 'Verbi',
    'conj.tab.quiz': 'Pratica',
    'conj.stat.mastered': 'Forme\napprese',
    'conj.stat.seen': 'Forme\nviste',
    'conj.stat.learn': 'Da\nimparare',
    'conj.quiz.desc': 'Il test comprende {n} domande casuali. Per ogni forma devi scrivere la coniugazione corretta.',
    'conj.quiz.start': 'Inizia il test',
    'conj.question': 'Domanda {i} / {n}',
    'conj.placeholder': 'Scrivi la forma...',
    'conj.confirm': 'Conferma',
    'conj.next': 'Avanti \u2192',
    'conj.correct': '\u2714 Corretto!',
    'conj.wrong': '\u2716 Risposta corretta: ',
    'conj.result.pct': '% di risposte corrette',
    'conj.to.review': 'Da rivedere',
    'conj.perfect': 'Perfetto! Tutte le risposte sono corrette!',
    'conj.retry': 'Riprova',
    'conj.error': 'Errore: ',
    'conj.level.all': 'Tutti i livelli',
    'conj.locked': 'Bloccato',
    'conj.unlock.need': '{n} forme per sbloccare il livello {l}',
    'conj.unlock.pct': '75% richiesto',
    'conj.due.badge': 'Da rivedere: {n}',
    'conj.status.new': 'Nuovo',
    'conj.status.learning': 'In corso',
    'conj.status.cooldown': 'Pausa {n}g',
    'conj.status.due': 'Da rivedere',
    'conj.status.archived': 'Archiviato',
    'conj.quiz.level.badge': 'N{n}',
    'conj.level.progress': '{done}/{total} forme — {pct}%',
    'conj.unlock.congrats': 'Livello {n} sbloccato!',
    'conj.pool.empty': 'Nessuna forma disponibile. Tutte le forme sono in pausa o archiviate.',
    'conj.verb.group': 'Gruppo: {g}',
    'conj.tense.presente': 'Indicativo Presente',
    'conj.tense.passato-prossimo': 'Passato Prossimo',
    'conj.tense.imperfetto': 'Imperfetto',
    'conj.tense.futuro': 'Futuro Semplice',
    'conj.tense.congiuntivo-presente': 'Congiuntivo Presente',
    'conj.tense.condizionale-presente': 'Condizionale Presente',

    // Translation module
    'nav.translation': 'Traduzione',
    'transl.title': 'Traduzione',
    'transl.tab.list': 'Frasi',
    'transl.tab.quiz': 'Pratica',
    'transl.stat.mastered': 'Frasi\napprese',
    'transl.stat.seen': 'Frasi\nviste',
    'transl.stat.learn': 'Da\nimparare',
    'transl.quiz.desc': 'Il test comprende {n} frasi casuali. Per ogni frase devi scrivere la traduzione (italiano ↔ francese).',
    'transl.quiz.start': 'Inizia il test',
    'transl.question': 'Domanda {i} / {n}',
    'transl.dir.itfr': 'Italiano → Francese',
    'transl.dir.frit': 'Francese → Italiano',
    'transl.placeholder': 'Scrivi la traduzione...',
    'transl.confirm': 'Conferma',
    'transl.next': 'Avanti →',
    'transl.correct': '✔ Corretto!',
    'transl.wrong': '✖ Risposta corretta: ',
    'transl.result.pct': '% di risposte corrette',
    'transl.to.review': 'Da rivedere',
    'transl.perfect': 'Perfetto! Tutte le risposte sono corrette!',
    'transl.retry': 'Riprova',
    'transl.due.badge': 'Da rivedere: {n}',
    'transl.status.new': 'Nuovo',
    'transl.status.learning': 'In corso',
    'transl.status.cooldown': 'Pausa {n}g',
    'transl.status.due': 'Da rivedere',
    'transl.status.archived': 'Archiviato',
    'transl.locked': 'Bloccato',
    'transl.locked.hint': 'Impara: {words}',
    'transl.pool.empty': 'Nessuna frase disponibile. Lavora sul vocabolario per sbloccare nuove frasi.',
    'transl.go.vocab': 'Vai al Vocabolario',
    'transl.error': 'Errore: ',

    // Settings modal
    'settings.title': 'Impostazioni',
    'settings.dark': 'Modalità scura',
    'settings.accents': 'Accenti rigorosi',
    'settings.accents.desc': 'Se attivo, "è" e "e" sono considerati diversi nelle risposte.',
    'settings.export': 'Esporta progressione',
    'settings.import': 'Importa progressione',
    'settings.close': 'Chiudi',
    'settings.invalid.file': 'File non valido.',
    'settings.import.error': "Errore durante l'importazione.",
  },

  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.stats': 'Statistiques',
    'nav.vocab': 'A-Z Vocabulaire',
    'nav.conj': 'Conjugaison',
    'sidebar.error': 'Erreur de chargement du menu.',

    // App header
    'app.title': 'Grammaire Italienne',
    'app.init.error': "Erreur d'initialisation de l'app : ",

    // Home
    'home.welcome': 'Bienvenue\u00a0!',
    'home.subtitle': 'Étudie la grammaire italienne avec des exercices interactifs.',
    'home.continue.title': "Reprends où tu t'es arrêté",
    'home.continue.subtitle': 'Fiche {id}\u00a0: {title}',
    'home.continue.btn': 'Continuer',
    'home.stat.completed': 'Fiches complétées',
    'home.stat.total': 'Fiches au total',
    'home.stat.progress': 'Progression',
    'home.topics': 'Thèmes',
    'home.all': 'Toutes les fiches',
    'home.cat.count': '{n} fiches \u2022 {c} complétées',
    'home.error': 'Erreur de chargement\u00a0: ',
    'home.scheda.prefix': 'Fiche',

    // Scheda view
    'scheda.loading': 'Chargement...',
    'scheda.not.found': 'Fiche "{id}" introuvable.',
    'scheda.prefix': 'Fiche',
    'scheda.tab.theory': 'Théorie',
    'scheda.tab.exercises': 'Exercices',
    'scheda.prev': '\u2190 Fiche {id}',
    'scheda.next': 'Fiche {id} \u2192',
    'scheda.go.exercises': 'Aller aux exercices \u2192',
    'scheda.unavailable.title': 'Fiche non encore disponible',
    'scheda.unavailable.body': "Le contenu de la fiche {id} n'a pas encore été numérisé.",
    'scheda.back.home': "Retour à l'accueil",

    // Stats view
    'stats.title': 'Statistiques',
    'stats.global.score': 'Score global',
    'stats.questions': 'Questions répondues',
    'stats.completed': 'Fiches complétées',
    'stats.attempts': 'Tentatives totales',
    'stats.per.topic': 'Par thème',
    'stats.to.review': 'À revoir',
    'stats.retry': 'Réessayer \u2192',
    'stats.cat.count': '{c}/{n} fiches',
    'stats.empty': 'Aucun exercice encore complété. Commence à étudier\u00a0!',
    'stats.error': 'Erreur\u00a0: ',

    // Vocab view
    'vocab.title': 'Vocabulaire',
    'vocab.tab.list': 'Liste',
    'vocab.tab.quiz': 'Pratique',
    'vocab.stat.mastered': 'Mots\nappris',
    'vocab.stat.seen': 'Mots\nvus',
    'vocab.stat.learn': 'À\napprendre',
    'vocab.quiz.desc': 'Le test comprend {n} questions aléatoires. Pour chaque mot tu dois écrire la traduction (italien \u2194 français). Chaque bonne réponse vaut 1 point.',
    'vocab.quiz.start': 'Commencer le test',
    'vocab.question': 'Question {i} / {n}',
    'vocab.dir.itfr': 'Italien \u2192 Français',
    'vocab.dir.frit': 'Français \u2192 Italien',
    'vocab.placeholder': 'Écris la traduction...',
    'vocab.confirm': 'Confirmer',
    'vocab.next': 'Suivant \u2192',
    'vocab.correct': '\u2714 Correct\u00a0!',
    'vocab.wrong': '\u2716 Bonne réponse\u00a0: ',
    'vocab.result.pct': '% de réponses correctes',
    'vocab.to.review': 'À revoir',
    'vocab.perfect': 'Parfait\u00a0! Toutes les réponses sont correctes\u00a0!',
    'vocab.retry': 'Réessayer',
    'vocab.error': 'Erreur\u00a0: ',
    // Niveaux & répétition espacée
    'vocab.level.all': 'Tous les niveaux',
    'vocab.level.prefix': 'Niveau',
    'vocab.locked': 'Verrouillé',
    'vocab.unlock.need': '{n} mots pour débloquer le niveau {l}',
    'vocab.unlock.pct': '75% requis',
    'vocab.due.badge': 'À réviser\u00a0: {n}',
    'vocab.status.new': 'Nouveau',
    'vocab.status.learning': 'En cours',
    'vocab.status.cooldown': 'Pause {n}j',
    'vocab.status.due': 'À réviser',
    'vocab.status.archived': 'Archivé',
    'vocab.quiz.level.badge': 'N{n}',
    'vocab.level.progress': '{done}/{total} mots — {pct}%',
    'vocab.unlock.congrats': 'Niveau {n} débloqué\u00a0!',
    'vocab.pool.empty': 'Aucun mot disponible. Tous les mots sont en pause ou archivés.',

    // Conjugation view
    'conj.title': 'Conjugaison',
    'conj.tab.list': 'Verbes',
    'conj.tab.quiz': 'Entraînement',
    'conj.stat.mastered': 'Formes\nmaîtrisées',
    'conj.stat.seen': 'Formes\nvues',
    'conj.stat.learn': 'À\napprendre',
    'conj.quiz.desc': 'Le test comprend {n} questions aléatoires. Pour chaque forme tu dois écrire la conjugaison correcte.',
    'conj.quiz.start': 'Commencer le test',
    'conj.question': 'Question {i} / {n}',
    'conj.placeholder': 'Écris la forme...',
    'conj.confirm': 'Confirmer',
    'conj.next': 'Suivant \u2192',
    'conj.correct': '\u2714 Correct\u00a0!',
    'conj.wrong': '\u2716 Bonne réponse\u00a0: ',
    'conj.result.pct': '% de réponses correctes',
    'conj.to.review': 'À revoir',
    'conj.perfect': 'Parfait\u00a0! Toutes les réponses sont correctes\u00a0!',
    'conj.retry': 'Réessayer',
    'conj.error': 'Erreur\u00a0: ',
    'conj.level.all': 'Tous les niveaux',
    'conj.locked': 'Verrouillé',
    'conj.unlock.need': '{n} formes pour débloquer le niveau {l}',
    'conj.unlock.pct': '75% requis',
    'conj.due.badge': 'À réviser\u00a0: {n}',
    'conj.status.new': 'Nouveau',
    'conj.status.learning': 'En cours',
    'conj.status.cooldown': 'Pause {n}j',
    'conj.status.due': 'À réviser',
    'conj.status.archived': 'Archivé',
    'conj.quiz.level.badge': 'N{n}',
    'conj.level.progress': '{done}/{total} formes — {pct}%',
    'conj.unlock.congrats': 'Niveau {n} débloqué\u00a0!',
    'conj.pool.empty': 'Aucune forme disponible. Toutes les formes sont en pause ou archivées.',
    'conj.verb.group': 'Groupe\u00a0: {g}',
    'conj.tense.presente': 'Présent de l\'indicatif',
    'conj.tense.passato-prossimo': 'Passé composé',
    'conj.tense.imperfetto': 'Imparfait',
    'conj.tense.futuro': 'Futur simple',
    'conj.tense.congiuntivo-presente': 'Subjonctif présent',
    'conj.tense.condizionale-presente': 'Conditionnel présent',

    // Translation module
    'nav.translation': 'Traduction',
    'transl.title': 'Traduction',
    'transl.tab.list': 'Phrases',
    'transl.tab.quiz': 'Entraînement',
    'transl.stat.mastered': 'Phrases\nmaîtrisées',
    'transl.stat.seen': 'Phrases\nvues',
    'transl.stat.learn': '\xc0\napprendre',
    'transl.quiz.desc': 'Le test comprend {n} phrases aléatoires. Pour chaque phrase tu dois écrire la traduction (italien ↔ français).',
    'transl.quiz.start': 'Commencer le test',
    'transl.question': 'Question {i} / {n}',
    'transl.dir.itfr': 'Italien → Français',
    'transl.dir.frit': 'Français → Italien',
    'transl.placeholder': 'Écris la traduction...',
    'transl.confirm': 'Confirmer',
    'transl.next': 'Suivant →',
    'transl.correct': '✔ Correct !',
    'transl.wrong': '✖ Bonne réponse : ',
    'transl.result.pct': '% de réponses correctes',
    'transl.to.review': 'À revoir',
    'transl.perfect': 'Parfait ! Toutes les réponses sont correctes !',
    'transl.retry': 'Réessayer',
    'transl.due.badge': 'À réviser : {n}',
    'transl.status.new': 'Nouveau',
    'transl.status.learning': 'En cours',
    'transl.status.cooldown': 'Pause {n}j',
    'transl.status.due': 'À réviser',
    'transl.status.archived': 'Archivé',
    'transl.locked': 'Verrouillé',
    'transl.locked.hint': 'Apprenez : {words}',
    'transl.pool.empty': 'Aucune phrase disponible. Travaillez sur le vocabulaire pour débloquer de nouvelles phrases.',
    'transl.go.vocab': 'Aller au Vocabulaire',
    'transl.error': 'Erreur : ',

    // Settings modal
    'settings.title': 'Paramètres',
    'settings.dark': 'Mode sombre',
    'settings.accents': 'Accents stricts',
    'settings.accents.desc': 'Si activé, "è" et "e" sont considérés différents dans les réponses.',
    'settings.export': 'Exporter la progression',
    'settings.import': 'Importer la progression',
    'settings.close': 'Fermer',
    'settings.invalid.file': 'Fichier invalide.',
    'settings.import.error': "Erreur lors de l'importation.",
  }
};

/**
 * Get the current UI language ('it' or 'fr').
 */
export function getLanguage() {
  return getSettings().language || 'it';
}

/**
 * Set the UI language and notify all listeners.
 * @param {'it'|'fr'} lang
 */
export function setLanguage(lang) {
  updateSettings({ language: lang });
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

/**
 * Translate a key with optional variable interpolation.
 * @param {string} key
 * @param {Object} vars - e.g. { id: '3', title: 'Gli Articoli' }
 * @returns {string}
 */
export function t(key, vars = {}) {
  const lang = getLanguage();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['it'];
  let str = dict[key];
  if (str === undefined) {
    str = TRANSLATIONS['it'][key];
  }
  if (str === undefined) {
    return key;
  }
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

/**
 * Get a localized name from a manifest object (category or scheda).
 * Falls back to the Italian name if no French translation exists.
 * @param {Object} obj - e.g. category or scheda entry
 * @param {'name'|'title'|'subtitle'} field
 * @returns {string}
 */
export function localName(obj, field) {
  const lang = getLanguage();
  if (lang === 'fr') {
    const frKey = `${field}_fr`;
    if (obj[frKey]) return obj[frKey];
  }
  return obj[field] || '';
}
