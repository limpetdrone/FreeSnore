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
    startTrackingWithDelay: '{delay} késleltetéssel',
    factorsSelectedCount: '{count} aktív',
    tapToCustomize: 'Koppints a tényezők kiválasztásához',
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
    nightNoiseTimeline: 'Horkolás idővonal',
    timelineHint: 'Koppints egy oszlopra: megmutatja, mennyit horkoltál akkor, és vissza is hallgathatod.',
    timelineEmpty: 'Nincs elegendő adat az éjszakai idővonalhoz',
    timelineSnoreDetail: 'Horkolás: {seconds} mp · {db} dB ({level})',
    timelineNoSnore: 'Nem volt horkolás',
    timelineNoData: 'Erről az időszakról nincs adat',
    summaryTitle: 'Az éjszaka röviden',
    summaryQuietNight: 'Csendes éjszaka volt: szinte egyáltalán nem horkoltál.',
    summaryAmount: 'Az alvásidőd {percent}%-ában horkoltál, összesen {snore}.',
    summaryConcentrated: 'A horkolás nagy része az éjszaka {part} volt.',
    summaryPartStart: 'elején',
    summaryPartMiddle: 'közepén',
    summaryPartEnd: 'végén',
    summarySpread: 'A horkolás elszórtan, az egész éjszakán át jelentkezett.',
    summarySingleEpisode: 'Egyetlen összefüggő horkolási szakasz volt, {from} és {to} között ({duration}).',
    summaryEpisodes: '{count} külön horkolási szakasz volt; a leghosszabb {from} és {to} között ({duration}).',
    summaryQuietStretch: 'A leghosszabb csendes időszak {duration} volt ({from}–{to}).',
    summaryMostlyLoud: 'A horkolás többnyire hangos volt, a leghangosabb {time} körül ({db} dB).',
    summaryMostlyLight: 'A horkolás többnyire halk volt, a leghangosabb {time} körül ({db} dB).',
    summaryUsual: 'Ez nagyjából a szokásos szinted (átlagosan {avg} pont).',
    summaryBetter: 'Ez jobb, mint az előző éjszakáid átlaga ({score} pont a szokásos {avg} helyett).',
    summaryWorse: 'Ez rosszabb, mint az előző éjszakáid átlaga ({score} pont a szokásos {avg} helyett).',
    summaryFactorHigher: 'A „{factor}” jelölésű éjszakákon átlagosan {pct}%-kal magasabb a pontszámod.',
    summaryFactorLower: 'A „{factor}” jelölésű éjszakákon átlagosan {pct}%-kal alacsonyabb a pontszámod.',
    summaryJumpHint: 'Koppints ide, és az idővonalon kijelölöm a leghosszabb szakaszt.',
    summaryRate: 'Összesen {count} horkolást ismertem fel; ez óránként átlagosan {rate} (horkolási index).',
    summaryPatternContinuous: 'Mintázat: tartós horkolás – a horkolás nagy része egy hosszú, összefüggő szakaszban volt.',
    summaryPatternIntermittent: 'Mintázat: szakaszos horkolás – többször elkezdődött, majd csendesebb időszak után abbamaradt.',
    summaryPatternSporadic: 'Mintázat: alkalmi horkolás – csak néhány rövid, elszórt szakasz.',
    insightTitle: 'Mit jelenthet?',
    insightRate:
      'A horkolási index klinikai vizsgálatokban horkolók között is széles tartományban mozog, és nincs elfogadott határértéke, ezért önmagában nem diagnosztikus [8].',
    insightEarly:
      'Az éjszaka első harmadában a legtöbb a mélyalvás (N3) [5]. Alvásvizsgálatok szerint a horkolás a mélyebb, N2–N3 szakaszokban a leggyakoribb és a leghosszabb [2, 3], így a főleg korai horkolás illik a szokásos alvásszerkezethez.',
    insightMiddle:
      'Az éjszaka közepén a könnyebb, N2 alvás a jellemző; felnőtteknél a horkolási idő nagyjából kétharmada erre a szakaszra esik [2].',
    insightLate:
      'Az éjszaka utolsó harmadában a REM-alvás a legjellemzőbb [5]. REM alatt általában kevesebb a horkolás [2], így a főleg hajnali horkolás mögött inkább a testhelyzet (pl. hanyatt fekvés) állhat; ritkábban REM-hez kötött légzészavar is okozhatja [6].',
    insightAlcohol:
      'Erre az éjszakára alkoholt jelöltél. Az alkohol ellazítja a garat izmait: egy alvásvizsgálatban 0,5‰ véralkoholszintnél 1,6-szorosára, 0,8‰-nél 4,2-szeresére nőtt a horkolási index [4]. A hatás addig tart, amíg az alkohol le nem bomlik.',
    insightContinuous:
      'A hosszú, megszakítás nélküli horkolás azt jelzi, hogy a légút az éjszaka nagy részében beszűkült. Ez önmagában ártalmatlan, ún. egyszerű horkolás is lehet; ezt csak alvásvizsgálat tudja elkülöníteni az alvási apnoétól [7].',
    insightIntermittent:
      'A ki-be kapcsoló horkolás gyakran testhelyzet-váltással függ össze: hanyatt fekve a nyelv és a lágy szájpad hátrébb kerül, oldalt fekve a horkolás sokszor megszűnik. Jelöld be esténként a testhelyzetet, és az összevetés megmutatja, nálad számít-e.',
    insightLoud:
      'A horkolás hangereje a vizsgálatok szerint inkább a légzészavar súlyosságával függ össze, mint az alvásszakasszal [3]. A telefon mérése nem kalibrált, ezért a dB-értékek csak egymáshoz viszonyítva beszédesek.',
    insightDoctor:
      'Ha a horkoláshoz fulladásos felriadás, mások által észlelt légzéskimaradás vagy nappali álmosság társul, érdemes alvásvizsgálatot kérni – ezek erősebb jelei az alvási apnoénak, mint maga a horkolás.',
    referencesTitle: 'Források',
    methodNote:
      'A horkolást a hangesemények hossza és a légzés ritmusa alapján ismerjük fel [1]; horkolási időnek azokat a perceket számoljuk, amelyekben horkolás volt.',
    timelinePlay: 'Részlet lejátszása',
    timelineStop: 'Lejátszás leállítása',
    timelinePrevious: 'Előző horkolás',
    timelineNext: 'Következő horkolás',
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
    stopOnAlarmTitle: 'Leállítás ébresztőkor',
    stopOnAlarmDesc: 'Ha megszólal a telefon ébresztője, a figyelés leáll és az éjszaka elmentődik (az első 30 percben még nem). iPhone-on egy hívás vagy a Siri is leállítja, mert ilyenkor a rendszer elveszi a mikrofont.',
    alarmStoppedTitle: '🌙 Figyelés leállítva',
    alarmStoppedBody: 'A figyelés automatikusan leállt (ébresztő vagy hívás), az éjszaka elmentve.',
    keepFullRecordingTitle: 'Felvétel megőrzése horkolás nélkül is',
    keepFullRecordingDesc: 'A teljes éjszakai hangfájl akkor is megmarad (és exportálható), ha nem észlelt horkolást. Hasznos teszteléshez; kb. 100 MB éjszakánként.',
    exportRecordingBtn: 'Teljes éjszakai felvétel exportálása',
    exportRecordingDesc: 'A teljes hangfájl (m4a, {size} MB) mentése vagy megosztása, pl. a Fájlok appba vagy AirDroppal.',
    exportRecordingMissing: 'Ehhez az éjszakához nincs mentett felvétel ezen a telefonon.',
    exportRecordingError: 'A felvétel exportálása nem sikerült.',
    aboutTitle: 'TestFlight & Alkalmazás Infó',
    versionLabel: 'Verzió',
    platformLabel: 'Platform',

    // PDF Report
    pdfReportTitle: 'FreeSnore Alvás- és Horkolásjelentés',
    pdfGeneratedDate: 'Létrehozva: {date}',
    pdfDoctorDisclaimer:
      'FIGYELEM: Ez a jelentés nem minősül orvosi diagnózisnak. Az akusztikai adatok orvosi konzultáció vagy alváslaboros vizsgálat kiegészítésére szolgálnak.',
    pdfPreviewTitle: 'Jelentés Előnézete',
    pdfShareReport: 'Megosztás / Mentés (PDF)',
    generatingPdf: 'Jelentés készítése...',
    periodReportTitle: 'FreeSnore Időszakos Horkolásjelentés',
    periodReportButton: 'Időszakos jelentés',
    periodPickTitle: 'Jelentés időszaka',
    periodLastWeek: 'Elmúlt 7 nap',
    periodLastMonth: 'Elmúlt 30 nap',
    periodCustom: 'Egyéni időszak',
    periodFrom: 'Kezdete',
    periodTo: 'Vége',
    periodNightsFound: '{count} éjszaka ebben az időszakban',
    periodCreate: 'Jelentés készítése',
    periodNoNights: 'Ebben az időszakban nincs rögzített éjszaka.',
    periodNights: 'Éjszakák',
    periodAvgSleep: 'Átl. alvásidő',
    periodAvgSnore: 'Átl. horkolás',
    periodAvgScore: 'Átl. pontszám',
    periodSummaryTitle: 'Az időszak röviden',
    periodAmount: '{nights} éjszakát rögzítettél. Az alvásidő {percent}%-ában horkoltál (éjszakánként átlagosan {avgSnore}); az átlagos pontszám {avgScore}.',
    periodQuietNights: '{total} éjszakából {count} volt szinte horkolásmentes (az alvásidő kevesebb mint 5%-a).',
    periodBestWorst: 'A legcsendesebb éjszaka {best} volt ({bestScore} pont), a leghangosabb {worst} ({worstScore} pont).',
    periodTrendStable: 'Az időszak során a horkolás nagyjából változatlan maradt.',
    periodTrendBetter: 'Az időszak második felében javult a helyzet (átlagosan {from} helyett {to} pont).',
    periodTrendWorse: 'Az időszak második felében romlott a helyzet (átlagosan {from} helyett {to} pont).',
    periodPatterns: 'Mintázat szerint: {continuous} tartós, {intermittent} szakaszos és {sporadic} alkalmi horkolású éjszaka.',
    periodThirds: 'A horkolás {start}%-a az éjszakák első, {middle}%-a középső és {end}%-a utolsó harmadára esett.',
    periodScoreChart: 'Horkolási pontszám éjszakánként',
    periodNightsTable: 'Éjszakák',
    periodDate: 'Dátum',
    periodScore: 'Pontszám',
    periodTime: 'Időtartam',
    periodFactor: 'Szokás / gyógymód',
    periodWith: 'Vele',
    periodWithout: 'Nélküle',
    periodDifference: 'Eltérés',
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
    startTrackingWithDelay: 'with {delay} delay',
    factorsSelectedCount: '{count} selected',
    tapToCustomize: 'Tap to select factors',
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
    nightNoiseTimeline: 'Snoring Timeline',
    timelineHint: 'Tap a bar to see how much you snored then and listen back to it.',
    timelineEmpty: 'Not enough data for the night timeline',
    timelineSnoreDetail: 'Snoring: {seconds} s · {db} dB ({level})',
    timelineNoSnore: 'No snoring',
    timelineNoData: 'No data for this period',
    summaryTitle: 'Your night in brief',
    summaryQuietNight: 'A quiet night: you hardly snored at all.',
    summaryAmount: 'You snored for {percent}% of the night, {snore} in total.',
    summaryConcentrated: 'Most of the snoring happened in the {part} of the night.',
    summaryPartStart: 'first part',
    summaryPartMiddle: 'middle',
    summaryPartEnd: 'last part',
    summarySpread: 'Snoring came and went throughout the night.',
    summarySingleEpisode: 'There was one continuous snoring episode, from {from} to {to} ({duration}).',
    summaryEpisodes: 'There were {count} separate snoring episodes; the longest ran from {from} to {to} ({duration}).',
    summaryQuietStretch: 'Your longest quiet stretch was {duration} ({from}–{to}).',
    summaryMostlyLoud: 'The snoring was mostly loud, peaking around {time} ({db} dB).',
    summaryMostlyLight: 'The snoring was mostly light, peaking around {time} ({db} dB).',
    summaryUsual: 'That is about your usual level (average {avg} points).',
    summaryBetter: 'Better than your recent average ({score} points vs. the usual {avg}).',
    summaryWorse: 'Worse than your recent average ({score} points vs. the usual {avg}).',
    summaryFactorHigher: 'On nights marked “{factor}”, your score is {pct}% higher on average.',
    summaryFactorLower: 'On nights marked “{factor}”, your score is {pct}% lower on average.',
    summaryJumpHint: 'Tap to show the longest episode on the timeline.',
    summaryRate: 'I detected {count} snores in total, {rate} per hour on average (snore index).',
    summaryPatternContinuous: 'Pattern: continuous snoring – most of it happened in one long, unbroken episode.',
    summaryPatternIntermittent: 'Pattern: intermittent snoring – it started and stopped several times, with quieter periods in between.',
    summaryPatternSporadic: 'Pattern: occasional snoring – only a few short, scattered episodes.',
    insightTitle: 'What it may mean',
    insightRate:
      'In clinical studies the snore index varies widely even among snorers and has no accepted cut-off, so on its own it is not diagnostic [8].',
    insightEarly:
      'The first third of the night holds most of the deep (N3) sleep [5]. Sleep studies find snoring most frequent and longest in the deeper N2–N3 stages [2, 3], so snoring mainly early in the night fits the usual sleep structure.',
    insightMiddle:
      'The middle of the night is mostly lighter N2 sleep; in adults about two thirds of snoring time falls into this stage [2].',
    insightLate:
      'The last third of the night is richest in REM sleep [5]. Snoring is usually less common in REM [2], so snoring mainly in the early morning may rather come from body position (e.g. lying on the back); less often it is caused by REM-related breathing disorders [6].',
    insightAlcohol:
      'You marked alcohol for this night. Alcohol relaxes the throat muscles: in a sleep study the snore index rose 1.6-fold at 0.5‰ and 4.2-fold at 0.8‰ blood alcohol [4]. The effect lasts until the alcohol is broken down.',
    insightContinuous:
      'Long, unbroken snoring means the airway was narrowed for much of the night. This can be harmless, so-called simple snoring; only a sleep study can tell it apart from sleep apnea [7].',
    insightIntermittent:
      'Snoring that comes and goes is often linked to changes in body position: on the back the tongue and soft palate fall backwards, on the side snoring often stops. Mark your sleeping position in the evening and the comparison will show whether it matters for you.',
    insightLoud:
      'Studies link snoring loudness more to the severity of breathing disorders than to the sleep stage [3]. Phone measurements are not calibrated, so dB values are meaningful only relative to each other.',
    insightDoctor:
      'If snoring comes with waking up gasping or choking, breathing pauses noticed by others, or daytime sleepiness, ask for a sleep study – these are stronger signs of sleep apnea than snoring itself.',
    referencesTitle: 'Sources',
    methodNote:
      'Snores are recognized from the length of sound events and the rhythm of breathing [1]; snoring time counts the minutes in which there was snoring.',
    timelinePlay: 'Play snippet',
    timelineStop: 'Stop playback',
    timelinePrevious: 'Previous snoring',
    timelineNext: 'Next snoring',
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
    stopOnAlarmTitle: 'Stop when the alarm rings',
    stopOnAlarmDesc: 'When your phone\'s alarm goes off, tracking stops and the night is saved (not in the first 30 minutes). On iPhone a call or Siri stops it too, since the system takes the microphone away.',
    alarmStoppedTitle: '🌙 Tracking stopped',
    alarmStoppedBody: 'Tracking stopped automatically (alarm or call); your night has been saved.',
    keepFullRecordingTitle: 'Keep recording without snoring',
    keepFullRecordingDesc: 'Keeps (and lets you export) the whole night\'s audio even when no snoring was detected. Useful for testing; about 100 MB per night.',
    exportRecordingBtn: 'Export full night recording',
    exportRecordingDesc: 'Save or share the whole audio file (m4a, {size} MB), e.g. to Files or via AirDrop.',
    exportRecordingMissing: 'There is no saved recording of this night on this phone.',
    exportRecordingError: 'Could not export the recording.',
    aboutTitle: 'TestFlight & App Information',
    versionLabel: 'Version',
    platformLabel: 'Platform',

    // PDF Report
    pdfReportTitle: 'FreeSnore Sleep & Snore Report',
    pdfGeneratedDate: 'Generated: {date}',
    pdfDoctorDisclaimer:
      'NOTICE: This report is for informational purposes only and does not constitute a clinical medical diagnosis. It can assist your physician or sleep specialist in evaluating sleep breathing patterns.',
    pdfPreviewTitle: 'Report Preview',
    pdfShareReport: 'Share / Save (PDF)',
    generatingPdf: 'Generating report...',
    periodReportTitle: 'FreeSnore Snoring Report for a Period',
    periodReportButton: 'Period report',
    periodPickTitle: 'Report period',
    periodLastWeek: 'Last 7 days',
    periodLastMonth: 'Last 30 days',
    periodCustom: 'Custom period',
    periodFrom: 'From',
    periodTo: 'To',
    periodNightsFound: '{count} nights in this period',
    periodCreate: 'Create report',
    periodNoNights: 'No nights were recorded in this period.',
    periodNights: 'Nights',
    periodAvgSleep: 'Avg. sleep',
    periodAvgSnore: 'Avg. snoring',
    periodAvgScore: 'Avg. score',
    periodSummaryTitle: 'The period in brief',
    periodAmount: 'You recorded {nights} nights. You snored for {percent}% of your sleep, {avgSnore} per night on average; the average score was {avgScore}.',
    periodQuietNights: '{count} of {total} nights were nearly snore-free (less than 5% of the night).',
    periodBestWorst: 'The quietest night was {best} ({bestScore} points), the loudest {worst} ({worstScore} points).',
    periodTrendStable: 'Snoring stayed about the same over the period.',
    periodTrendBetter: 'Things improved in the second half of the period ({to} points on average instead of {from}).',
    periodTrendWorse: 'Things got worse in the second half of the period ({to} points on average instead of {from}).',
    periodPatterns: 'By pattern: {continuous} nights of continuous, {intermittent} of intermittent and {sporadic} of occasional snoring.',
    periodThirds: '{start}% of the snoring fell into the first third of the nights, {middle}% into the middle and {end}% into the last third.',
    periodScoreChart: 'Snore score per night',
    periodNightsTable: 'Nights',
    periodDate: 'Date',
    periodScore: 'Score',
    periodTime: 'Time',
    periodFactor: 'Habit / remedy',
    periodWith: 'With',
    periodWithout: 'Without',
    periodDifference: 'Difference',
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
