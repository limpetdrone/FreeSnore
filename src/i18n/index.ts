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
    lockTip: '💡 Le is zárhatod a képernyőt az oldalsó gombbal; a felvétel a háttérben zavartalanul folytatódik.',

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
    nudgesTriggered: 'Rezgések száma',
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
    shareClip: 'Megosztás',
    noAudioFile: 'Nincs elérhető hangfájl ehhez a részlethez.',

    // Apnea Disclaimer
    apneaWarningTitle: '⚠️ Légzéskimaradás (Apnoe) gyanú',
    apneaWarningBody:
      'Az éjszaka folyamán {count} alkalommal észleltünk olyan epizódot, ahol horkolást hirtelen csend, majd mély horkantás követett. Ez alvási apnoéra (OSA) utalhat. Javasoljuk orvosi alvásvizsgálat elvégzését!',
    apneaIndicator: '{count} légzéskimaradási gyanú',

    // Anti-Snore Nudge Notification
    nudgeApplied: 'Horkolásgátló rezgés aktiválva {count} alkalommal',

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
    remedyImpactTitle: 'Gyógymódok és tényezők hatása:',
    averagePoints: 'átlagpont',
    occurrencesSuffix: 'alkalom',
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
    antiSnoreNudgeTitle: 'Horkolásgátló Rezgés (Anti-Snore Nudge)',
    antiSnoreNudgeDesc: 'Finom rezgéssel jelzi a tartós horkolást, hogy pozíciót válts felébredés nélkül.',
    keepAwakeTitle: 'Képernyő ébrentartása (Keep Awake)',
    keepAwakeDesc: 'Megakadályozza a telefon automatikus lezárását.',
    saveClipsTitle: 'Horkolási hangminták rögzítése',
    saveClipsDesc: 'Hangminták visszahallgatása és megosztása a kiértékelésben.',
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
    lockTip: '💡 You can lock the screen with the side button; background recording continues uninterrupted.',

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
    nudgesTriggered: 'Nudges triggered',
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
    shareClip: 'Share',
    noAudioFile: 'No audio file available for this snippet.',

    // Apnea Disclaimer
    apneaWarningTitle: '⚠️ Breathing Pause (Apnea) Suspected',
    apneaWarningBody:
      'We detected {count} episodes where loud snoring was followed by prolonged silence and sudden gasps. This pattern may indicate Obstructive Sleep Apnea (OSA). We recommend consulting a healthcare professional!',
    apneaIndicator: '{count} apnea events',

    // Anti-Snore Nudge Notification
    nudgeApplied: 'Anti-snore gentle vibration triggered {count} times',

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
    remedyImpactTitle: 'Impact of Factors & Remedies:',
    averagePoints: 'avg score',
    occurrencesSuffix: 'times',
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
    antiSnoreNudgeTitle: 'Anti-Snore Vibration (Nudge)',
    antiSnoreNudgeDesc: 'Gently vibrates the phone when sustained loud snoring is detected to encourage changing sleep position.',
    keepAwakeTitle: 'Keep Screen Awake',
    keepAwakeDesc: 'Prevents the device from automatically going to sleep while active.',
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
