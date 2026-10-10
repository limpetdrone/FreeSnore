import { getLocales } from 'expo-localization';

export type Language = 'hu' | 'en';

export const translations = {
  hu: {
    // Navigation & General
    appTitle: 'FreeSnore',
    nightsCount: '{count} éjszaka',
    tabRecord: 'Figyelés',
    tabHistory: 'Előzmények',
    tabSettings: 'Beállítások',

    // Record Screen - Idle
    recordHeroTitle: 'FreeSnore Figyelés',
    recordHeroSubtitle: 'Helyezd a telefont az éjjeliszekrényre, a mikrofonnal az ágy felé.',
    delayCardTitle: 'Felvétel késleltetése (elalvási idő)',
    delayCardDesc: 'Mennyi idővel az indítás után kezdje a tényleges figyelést és hangrögzítést?',
    immediate: 'Azonnal',
    minutesSuffix: 'perc',
    factorsCardTitle: 'Körülmények & Gyógymódok',
    factorsCardDesc: 'Kövesd nyomon, mi segít és mi rontja a mai horkolásodat.',
    factorsSectionAggravating: 'Kiváltó tényezők:',
    factorsSectionRemedies: 'Alkalmazott gyógymódok:',
    startTrackingButton: 'Alvás Figyelése Indítása',
    chargingTip: '💡 Tipp: Csatlakoztasd a telefont töltőre éjszakára a zavartalan működéshez.',
    lockTipIos: '💡 Le is zárhatod a képernyőt: a figyelés és az elemzés a háttérben is folytatódik.',
    lockTipAndroid: '💡 Hagyd bekapcsolva a képernyőt (az éjszakai óra mód sötét): Androidon lezárt képernyőnél az elemzés szünetel.',
    unitHour: 'ó',
    unitMin: 'p',
    unitSec: 'mp',
    aboutDescription: 'A FreeSnore egy ingyenes, nyílt forráskódú horkolásfigyelő. Nem orvostechnikai eszköz.',
    remedyCompareTitle: 'Mi segít? (átlagpont vele / nélküle)',
    remedyCompareLower: '{pct}%-kal alacsonyabb pontszám',
    remedyCompareHigher: '{pct}%-kal magasabb pontszám',
    remedyCompareHint: 'Tényezőnként legalább 3 éjszaka kell vele és nélküle is az összehasonlításhoz.',

    // Factors & Remedies
    factorBackSleep: 'Hanyatt alvás',
    factorSideSleep: 'Oldalfekvés',
    factorAlcohol: 'Alkohol',
    factorLateMeal: 'Késői vacsora',
    factorBlockedNose: 'Orrdugulás',
    factorFatigue: 'Fáradtság',
    factorStress: 'Stressz',
    remedyNasalStrips: 'Orrtágító tapasz',
    remedyHumidifier: 'Párásító',
    remedyMouthguard: 'Horkolásgátló fogvédő',
    remedyElevatedPillow: 'Megemelt párna',
    remedyNasalSpray: 'Orrspray',

    // Record Screen - Countdown
    countdownTitle: 'Elalvási Késleltetés',
    countdownSub: 'A tényleges hangfelvétel ennyi idő múlva kezdődik:',
    skipCountdown: 'Azonnali indítás',
    cancel: 'Mégse',

    // Record Screen - Recording
    monitoringActive: 'Alvás és Horkolás Figyelése...',
    elapsedSleepTime: 'Eltelt alvásidő',
    snoringTime: 'Horkolási idő',
    peakLoudness: 'Csúcs hangerő',
    nightClockModeBtn: 'Éjszakai sötétített óra mód',
    finishSleepBtn: 'Ébredés / Elemzés Befejezése',
    finishSleepPromptTitle: 'Alvás befejezése',
    finishSleepPromptBody: 'Szeretnéd leállítani a figyelést és megtekinteni a kiértékelést?',
    continueTracking: 'Folytatás',
    finishAction: 'Befejezés',
    micErrorTitle: 'Mikrofon hiba',
    micErrorBody: 'Nem sikerült hozzáférni a mikrofonhoz. Kérlek engedélyezd a mikrofonhasználatot a beállításokban!',
    saveErrorTitle: 'Mentési hiba',
    saveErrorBody: 'Nem sikerült elmenteni az éjszaka adatait.',

    // Night Clock
    nightClockMonitoring: 'Figyelés aktív',
    nightClockElapsed: 'Alvásidő',
    nightClockRestore: 'Kijelző visszaállítása',

    // Snore Intensity Levels
    levelQuiet: 'Csendes',
    levelLight: 'Halk',
    levelLoud: 'Hangos',
    levelEpic: 'Erős / Epic',

    // Detail Screen
    sessionDetailOverviewTab: 'Elemzés & Idővonal',
    sessionDetailClipsTab: 'Hangfelvételek ({count})',
    snoreScoreLabel: 'Horkolási Pontszám',
    totalSleepTime: 'Összes alvásidő',
    snoreDuration: 'Horkolási idő',
    delayLabel: 'Elalvási késleltetés',
    intensityDistribution: 'Horkolási intenzitás megoszlása',
    nightNoiseTimeline: 'Éjszakai zaj-idővonal (Snore Profile)',
    timelineHint: 'Koppints az oszlopokra a pontos időpont és hangerő megtekintéséhez.',
    habitsAndRemedies: 'Körülmények és alkalmazott gyógymódok',
    recordedClipsTitle: 'Rögzített horkolási minták',
    recordedClipsHint: 'A detektált horkolásokból rögzített hangminták visszahallgatása és megosztása.',
    noClips: 'Nem történt rögzített hangminta ezen az éjszakán',
    deleteSessionTitle: 'Munkamenet törlése',
    deleteSessionPrompt: 'Biztosan törölni szeretnéd ezt a mentett alváselemzést és a hangfelvételt?',
    deleteAction: 'Törlés',
    exportPdfBtn: 'Orvosi PDF Jelentés',
    noAudioFile: 'Nincs elérhető hangfájl ehhez a részlethez.',
    sharingUnavailable: 'A megosztás nem érhető el ezen az eszközön.',

    // History Screen
    historyDaily: 'Napi Bontás',
    historyWeekly: 'Heti Bontás',
    historyMonthly: 'Havi Bontás',
    recordedNights: 'Rögzített éjszakák ({count})',
    historyTapHint: 'Részletekhez és hangokhoz koppints',
    noRecordedNights: 'Még nincsenek rögzített éjszakák',
    noRecordedNightsSub: 'Indíts el egy alvásfigyelést az új felvétel készítéséhez.',
    sleepLabel: 'alvás',
    snoreLabel: 'horkolás',
    points: 'pont',
    samplesSuffix: 'minta',

    // Weekly Chart
    weeklyTitle: 'Heti Áttekintés',
    weeklySubtitle: 'Elmúlt 7 nap horkolási pontszámai',
    weeklyAverage: 'Heti átlag',
    trackedNights: 'Rögzített éjszaka',
    quietestNight: 'Legcsendesebb nap',
    loudestNight: 'Legerősebb nap',
    weekNightsList: 'A hét rögzített éjszakái',

    // Monthly Chart
    monthlyTitle: 'Havi Trendek és Elemzés',
    monthlySubtitle: 'Elmúlt 30 nap statisztikája',
    monthlyAverage: 'Havi átlag',
    fourWeekProgression: 'Heti bontás (utolsó 4 hét):',
    nightsSuffix: 'éjszaka',
    averagePoints: 'átlagpont',
    monthlyInsightTitle: '💡 Havi Összegzés',
    monthlyInsightGreat: 'Kitűnő eredmény! A horkolása az elmúlt hónapban az egészséges, alacsony tartományban maradt.',
    monthlyInsightModerate:
      'Mérsékelt horkolás tapasztalható. Az oldalfekvés és az orrtágító tapasz jelentősen csökkentheti az értékeket.',
    monthlyInsightSevere: 'Fokozott horkolási szint. Érdemes figyelni az alvási pozícióra és a légutak szabaddá tételére.',

    // Settings Screen
    settingsTitle: 'Beállítások',
    languageSectionTitle: 'Nyelv / Language',
    languageSectionDesc: 'Válaszd ki a megjelenítési nyelvet.',
    langHu: 'Magyar',
    langEn: 'English',
    defaultDelayTitle: 'Alapértelmezett Elalvási Késleltetés',
    defaultDelayDesc: 'A felvétel indítását követő várakozási idő az elalvás megkönnyítésére.',
    sensitivityTitle: 'Mikrofon Érzékenység',
    sensitivityDesc: 'Állítsd be, hogy milyen küszöbérték felett minősüljön a hang horkolásnak.',
    sensLow: 'Alacsony (52+ dB)',
    sensMed: 'Közepes (44+ dB)',
    sensHigh: 'Magas (38+ dB)',
    keepAwakeTitle: 'Képernyő ébrentartása (Keep Awake)',
    keepAwakeDesc: 'Androidon szükséges: lezárt képernyőnél az elemzés szünetel. iOS-en nem kell, ott kapcsold ki az akkumulátor kímélése érdekében.',
    saveClipsTitle: 'Horkolási hangminták rögzítése',
    saveClipsDesc: 'Hangminták visszahallgatása a kiértékelésben.',
    aboutTitle: 'TestFlight & Alkalmazás Infó',
    versionLabel: 'Verzió',
    platformLabel: 'Platform',

    // PDF Report
    pdfReportTitle: 'FreeSnore Alvás- és Horkolásjelentés',
    pdfGeneratedDate: 'Létrehozva: {date}',
    pdfDoctorDisclaimer:
      'FIGYELEM: Ez a jelentés nem minősül orvosi diagnózisnak. Az akusztikai adatok orvosi konzultáció vagy alváslaboros vizsgálat kiegészítésére szolgálnak.',
  },

  en: {
    // Navigation & General
    appTitle: 'FreeSnore',
    nightsCount: '{count} nights',
    tabRecord: 'Record',
    tabHistory: 'Trends',
    tabSettings: 'Settings',

    // Record Screen - Idle
    recordHeroTitle: 'FreeSnore Tracking',
    recordHeroSubtitle: 'Place your phone on the nightstand, microphone pointed towards the bed.',
    delayCardTitle: 'Start Delay (Fall Asleep Time)',
    delayCardDesc: 'How long after starting should actual snore monitoring and audio evaluation begin?',
    immediate: 'Immediate',
    minutesSuffix: 'min',
    factorsCardTitle: 'Factors & Remedies',
    factorsCardDesc: 'Track what triggers and what relieves your snoring tonight.',
    factorsSectionAggravating: 'Potential Triggers:',
    factorsSectionRemedies: 'Remedies Applied:',
    startTrackingButton: 'Start Sleep Tracking',
    chargingTip: '💡 Tip: Keep your phone connected to a charger overnight for seamless operation.',
    lockTipIos: '💡 You can lock the screen: monitoring and analysis continue in the background.',
    lockTipAndroid: '💡 Keep the screen on (the night clock is dark): on Android, analysis pauses while the screen is locked.',
    unitHour: 'h',
    unitMin: 'm',
    unitSec: 's',
    aboutDescription: 'FreeSnore is a free, open-source snore tracker. It is not a medical device.',
    remedyCompareTitle: 'What helps? (avg score with / without)',
    remedyCompareLower: '{pct}% lower score',
    remedyCompareHigher: '{pct}% higher score',
    remedyCompareHint: 'Comparison needs at least 3 nights with and 3 without each factor.',

    // Factors & Remedies
    factorBackSleep: 'Sleeping on Back',
    factorSideSleep: 'Sleeping on Side',
    factorAlcohol: 'Alcohol',
    factorLateMeal: 'Late Meal',
    factorBlockedNose: 'Stuffy Nose',
    factorFatigue: 'Tiredness',
    factorStress: 'Stress',
    remedyNasalStrips: 'Nasal Strips',
    remedyHumidifier: 'Humidifier',
    remedyMouthguard: 'Snore Mouthguard',
    remedyElevatedPillow: 'Elevated Pillow',
    remedyNasalSpray: 'Nasal Spray',

    // Record Screen - Countdown
    countdownTitle: 'Fall-Asleep Delay',
    countdownSub: 'Acoustic snore monitoring starts in:',
    skipCountdown: 'Start Now',
    cancel: 'Cancel',

    // Record Screen - Recording
    monitoringActive: 'Monitoring Sleep & Snoring...',
    elapsedSleepTime: 'Elapsed sleep time',
    snoringTime: 'Snoring time',
    peakLoudness: 'Peak loudness',
    nightClockModeBtn: 'Dimmed Night Clock Mode',
    finishSleepBtn: 'Wake Up / Finish Analysis',
    finishSleepPromptTitle: 'End Sleep Session',
    finishSleepPromptBody: 'Do you want to stop monitoring and view your snore evaluation?',
    continueTracking: 'Continue',
    finishAction: 'Finish',
    micErrorTitle: 'Microphone Error',
    micErrorBody: 'Could not access microphone. Please grant microphone permission in Settings!',
    saveErrorTitle: 'Save Error',
    saveErrorBody: 'Could not save session data.',

    // Night Clock
    nightClockMonitoring: 'Monitoring active',
    nightClockElapsed: 'Sleep time',
    nightClockRestore: 'Restore screen',

    // Snore Intensity Levels
    levelQuiet: 'Quiet',
    levelLight: 'Light',
    levelLoud: 'Loud',
    levelEpic: 'Epic',

    // Detail Screen
    sessionDetailOverviewTab: 'Analysis & Timeline',
    sessionDetailClipsTab: 'Audio Clips ({count})',
    snoreScoreLabel: 'Snore Score',
    totalSleepTime: 'Total sleep time',
    snoreDuration: 'Snoring duration',
    delayLabel: 'Start delay',
    intensityDistribution: 'Snore Intensity Distribution',
    nightNoiseTimeline: 'Night Sound Profile (Timeline)',
    timelineHint: 'Tap bars to inspect exact time and decibel loudness.',
    habitsAndRemedies: 'Tracked Factors & Applied Remedies',
    recordedClipsTitle: 'Recorded Snore Samples',
    recordedClipsHint: 'Replay and share notable snore audio events captured overnight.',
    noClips: 'No audio clips recorded for this night',
    deleteSessionTitle: 'Delete Session',
    deleteSessionPrompt: 'Are you sure you want to permanently delete this sleep session and audio recording?',
    deleteAction: 'Delete',
    exportPdfBtn: 'Export Doctor PDF Report',
    noAudioFile: 'No audio file available for this snippet.',
    sharingUnavailable: 'Sharing is not available on this device.',

    // History Screen
    historyDaily: 'Daily',
    historyWeekly: 'Weekly',
    historyMonthly: 'Monthly',
    recordedNights: 'Recorded Nights ({count})',
    historyTapHint: 'Tap for details and audio playback',
    noRecordedNights: 'No sleep sessions recorded yet',
    noRecordedNightsSub: 'Start a sleep tracking session to record your first night.',
    sleepLabel: 'sleep',
    snoreLabel: 'snoring',
    points: 'pts',
    samplesSuffix: 'clips',

    // Weekly Chart
    weeklyTitle: 'Weekly Overview',
    weeklySubtitle: 'Snore scores for the past 7 days',
    weeklyAverage: 'Weekly average',
    trackedNights: 'Recorded nights',
    quietestNight: 'Quietest night',
    loudestNight: 'Loudest night',
    weekNightsList: 'Nights Recorded This Week',

    // Monthly Chart
    monthlyTitle: 'Monthly Trends & Insights',
    monthlySubtitle: 'Statistics for the past 30 days',
    monthlyAverage: 'Monthly average',
    fourWeekProgression: '4-Week Progression:',
    nightsSuffix: 'nights',
    averagePoints: 'avg score',
    monthlyInsightTitle: '💡 Monthly Summary',
    monthlyInsightGreat: 'Excellent result! Your snoring stayed within the healthy, mild range this month.',
    monthlyInsightModerate:
      'Moderate snoring detected. Sleeping on your side and using nasal strips can significantly reduce scores.',
    monthlyInsightSevere: 'Elevated snoring levels. Consider sleep position adjustments and clearing nasal passages.',

    // Settings Screen
    settingsTitle: 'Settings',
    languageSectionTitle: 'Language / Nyelv',
    languageSectionDesc: 'Choose your preferred display language.',
    langHu: 'Magyar',
    langEn: 'English',
    defaultDelayTitle: 'Default Start Delay',
    defaultDelayDesc: 'Waiting period after starting to help you fall asleep peacefully.',
    sensitivityTitle: 'Microphone Sensitivity',
    sensitivityDesc: 'Adjust the acoustic loudness threshold required to classify snoring.',
    sensLow: 'Low (52+ dB)',
    sensMed: 'Medium (44+ dB)',
    sensHigh: 'High (38+ dB)',
    keepAwakeTitle: 'Keep Screen Awake',
    keepAwakeDesc: 'Needed on Android, where analysis pauses while the screen is locked. Not needed on iOS; leave it off there to save battery.',
    saveClipsTitle: 'Save Snore Audio Clips',
    saveClipsDesc: 'Capture and replay snore snippets during morning review.',
    aboutTitle: 'TestFlight & App Information',
    versionLabel: 'Version',
    platformLabel: 'Platform',

    // PDF Report
    pdfReportTitle: 'FreeSnore Sleep & Snore Report',
    pdfGeneratedDate: 'Generated: {date}',
    pdfDoctorDisclaimer:
      'NOTICE: This report is for informational purposes only and does not constitute a clinical medical diagnosis. It can assist your physician or sleep specialist in evaluating sleep breathing patterns.',
  },
};

let currentLanguage: Language = 'hu';

// Initialize language from device locale
try {
  const locales = getLocales();
  const deviceLang = locales[0]?.languageCode;
  if (deviceLang === 'en') {
    currentLanguage = 'en';
  } else {
    currentLanguage = 'hu';
  }
} catch {
  currentLanguage = 'hu';
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: keyof typeof translations['hu'], params?: Record<string, string | number>): string {
  const dict = translations[currentLanguage] || translations.hu;
  let text = dict[key] || translations.hu[key] || (key as string);

  if (params) {
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    });
  }

  return text;
}

type TranslationKey = keyof (typeof translations)['hu'];

// Factors are stored as translation keys so stats survive a language switch.
// Sessions saved before that change hold plain text, which is shown as-is.
export function tFactor(factor: string): string {
  return factor in translations.hu ? t(factor as TranslationKey) : factor;
}

export function formatHoursMinutes(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return hrs > 0 ? `${hrs}${t('unitHour')} ${mins}${t('unitMin')}` : `${mins}${t('unitMin')}`;
}
