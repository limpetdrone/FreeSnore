const showcaseData = {
  0: {
    img: "assets/screen_night_detail.jpg",
    alt: "FreeSnore Night Evaluation Screen",
    en: {
      tag: "Acoustic Evaluation",
      heading: "Overnight Acoustic Breakdown & Snore Score",
      desc: "Review your composite Snore Score, loudness distribution (Quiet, Light, Loud, Epic), and listen to recorded snoring episodes with interactive waveforms.",
      items: [
        "Weighted composite Snore Score (0 – 160) tracking severity over time",
        "Minute-by-minute interactive sound timeline with scrubable playback",
        "Automatic audio snippet recording of significant sound spikes"
      ]
    },
    hu: {
      tag: "Akusztikai Értékelés",
      heading: "Éjszakai Akusztikai Elemzés & Horkolási Pontszám",
      desc: "Részletes horkolási pontszám, hangerő-megoszlási görbe (Csendes, Halk, Hangos, Erős), valamint felvett epizódok interaktív visszahallgatása.",
      items: [
        "Súlyozott összetett Horkolási Pontszám (0 – 160) a súlyosság követésére",
        "Percről percre böngészhető interaktív hang-idővonal tekerési lehetőséggel",
        "Automatikus hangminta-rögzítés a kirívó hangerőcsúcsokból"
      ]
    }
  },
  1: {
    img: "assets/screen_environment.jpg",
    alt: "FreeSnore Pollen & Weather Tracking Screen",
    en: {
      tag: "Environmental Correlation",
      heading: "Outdoor Pollen, Humidity & Air Quality",
      desc: "Correlates your sleep quality with local Open-Meteo and Copernicus air data. Understand how environmental allergies impact your nighttime breathing.",
      items: [
        "Pollen tracking for Birch, Grass, Mugwort, and Ragweed (grains/m³)",
        "Ambient outdoor humidity, air pressure, and PM2.5 / PM10 particulate levels",
        "Automatic correlation insights linking high pollen days with nasal resistance"
      ]
    },
    hu: {
      tag: "Környezeti Összefüggések",
      heading: "Kültéri Pollen, Páratartalom & Levegőminőség",
      desc: "Összekapcsolja az alvásminőséget az Open-Meteo és a Copernicus légköri adataival. Tudd meg, mikor nehezíti meg a pollen az éjszakai légzésedet.",
      items: [
        "Nyír, fű, fekete üröm és parlagfű pollenterhelés pontos mérése (szemcse/m³)",
        "Kültéri relatív páratartalom, légnyomás és PM2.5 / PM10 szállópor adatok",
        "Automatikus egészségügyi összefüggések a magas pollenszint és a horkolás között"
      ]
    }
  },
  2: {
    img: "assets/screen_trends_streaks.jpg",
    alt: "FreeSnore Trends and Streaks Screen",
    en: {
      tag: "Habits & Trends",
      heading: "Quiet Goal Streaks & Lifestyle Comparisons",
      desc: "Build consistency with custom quiet sleep goals and visualize how daily habits impact your rest over days, weeks, and months.",
      items: [
        "Conscious quiet goal streak tracker with celebratory milestones",
        "Weekday vs. Weekend comparison revealing late-night & social impact",
        "Remedy efficacy tracking: measure the exact relief from side sleeping or nasal strips"
      ]
    },
    hu: {
      tag: "Szokások & Trendek",
      heading: "Csendes Cél-Sorozatok & Hétköznap vs. Hétvége",
      desc: "Tűzz ki egyéni csendes határértéket, építs sorozatokat, és lásd tisztán, hogyan változik az alvásod a hétköznapok és a hétvégék során.",
      items: [
        "Motiváló cél-sorozat számláló az egészséges és csendes éjszakákért",
        "Hétköznap vs. Hétvége összehasonlítás (késői fekvés, alkohol hatása)",
        "Gyógymódok hatásvizsgálata: mérd meg az oldalfekvés vagy az orrtapasz valódi hatását"
      ]
    }
  },
  3: {
    img: "assets/screen_pdf_preview.jpg",
    alt: "FreeSnore Clinical PDF Report Screen",
    en: {
      tag: "Physician Consultation",
      heading: "Clinical Medical PDF Report with In-App Preview",
      desc: "Export professional medical-grade sleep summaries ready for your ENT or sleep specialist, with full interactive preview before sharing.",
      items: [
        "Hour-by-hour acoustic spike timeline and decibel severity breakdown",
        "Applied remedies, factors, and local environmental weather summary",
        "Exportable as standard high-resolution PDF for printing or medical consultation"
      ]
    },
    hu: {
      tag: "Szakorvosi Konzultáció",
      heading: "Orvosi PDF Jelentés Teljes Alkalmazáson Belüli Előnézettel",
      desc: "Klinikai szintű összefoglaló jelentést készíthetsz fül-orr-gégészeti vagy alvásdiagnosztikai vizsgálatokhoz, küldés előtt áttekinthető előnézettel.",
      items: [
        "Óránkénti akusztikai csúcsidővonal és dB-alapú súlyossági eloszlás",
        "Alkalmazott gyógymódok, tényezők és környezeti légköri adatok összegzése",
        "Nagy felbontású, nyomtatható és megosztható PDF formátum"
      ]
    }
  }
};

const i18n = {
  hu: {
    navScreenshots: "Képernyők",
    navFeatures: "Funkciók",
    navHowItWorks: "Hogyan működik",
    navTestFlight: "TestFlight Béta",
    heroPill: "100% Ingyenes & Nyílt Forráskódú Horkolásfigyelő",
    heroTitle: "Ismerd meg az alvásod. <span class='gradient-text'>Fizetős falak nélkül.</span>",
    heroSubtitle: "A FreeSnore egy prémium, teljesen helyben futó horkolás- és alváselemző app iOS-re és Androidra. Nincsenek havidíjak, nincsenek felhős adatfeltöltések.",
    btnTestFlight: "Csatlakozás a TestFlight Bétához",
    btnGithub: "Forráskód a GitHubon",
    badgePrivate: "100% Helyi adatkezelés",
    badgeBattery: "Akkukímélő OLED óra",
    badgeFree: "Örökké ingyenes (Open Source)",
    phoneStatus: "Alvás & Horkolás Figyelése",
    phoneScoreLabel: "Horkolási Pontszám",
    phoneChip1: "✓ Oldalfekvés",
    phoneChip2: "✓ Orrtágító tapasz",
    phoneChip3: "7h 45m alvás",
    phoneBtn: "Elemzés Megtekintése",
    showcaseTag: "Képernyők & Funkciók",
    showcaseTitle: "Ismerd meg a FreeSnore felületét",
    showcaseSub: "Minden eszköz a horkolásod akusztikai megértéséhez és csökkentéséhez — tiszta, sötétített felülettel a zavartalan pihenésért.",
    tabNightDetail: "Éjszakai Elemzés",
    tabEnvironment: "Pollen & Környezet",
    tabTrends: "Trendek & Célok",
    tabPdfPreview: "Orvosi PDF Jelentés",
    thumbTitle0: "Éjszakai Elemzés",
    thumbDesc0: "Pontszám, görbe & hangok",
    thumbTitle1: "Pollen & Időjárás",
    thumbDesc1: "Open-Meteo környezeti adatok",
    thumbTitle2: "Cél-sorozatok",
    thumbDesc2: "Hétköznap vs. Hétvége",
    thumbTitle3: "Orvosi PDF",
    thumbDesc3: "Interaktív jelentés előnézet",
    featuresTag: "Korszerű Technológia",
    featuresTitle: "Minden funkció a nyugodt, pihentető éjszakákhoz",
    featuresSub: "Az elalvástól az ébredésig precízen kíséri végig az alvásodat, anélkül, hogy lemerítené a telefonodat.",
    feat1Title: "Akusztikai Horkolásérzékelés",
    feat1Desc: "A légzési ritmuson és időtartamon alapuló szűrés biztonsággal elválasztja a valódi horkolást a szoba zörejeitől és a forgolódástól.",
    feat2Title: "Elalvási Késleltetés",
    feat2Desc: "A mikrofon csendben, az iOS háttérszabályai szerint aktiválódik, miközben az akusztikai kiértékelés csak az elalvás után indul el.",
    feat3Title: "Éjszakai Hang-Idővonal",
    feat3Desc: "Percről percre visszanézheted a hangerőcsúcsokat és a horkolási szakaszokat, interaktív visszahallgatási lehetőséggel.",
    feat4Title: "Pollen & Környezeti Levegőminőség",
    feat4Desc: "Összefüggés-vizsgálat az Open-Meteo és Copernicus adatokkal: nyír, fű, parlagfű pollen, páratartalom és szállópor (PM2.5) hatása.",
    feat5Title: "Cél-sorozatok & Életmód Trendek",
    feat5Desc: "Tűzz ki egyéni csendes célokat és építs sorozatokat! Vizsgáld a hétköznap és hétvége közötti különbséget (késői fekvés, alkohol).",
    feat6Title: "Natív Hangtömörítés",
    feat6Desc: "A régebbi éjszakákból csak a horkolásos szakaszokat tartja meg veszteségmentes natív vágással (~80 MB-ból 5-15 MB), így kíméli a tárhelyet.",
    feat7Title: "Orvosi PDF Jelentés Előnézettel",
    feat7Desc: "Klinikai szintű alvásjelentést exportálhatsz és oszthatsz meg a szakorvosoddal, amit a küldés előtt teljes egészében áttekinthetsz.",
    feat8Title: "OLED Éjszakai Óra & Ébresztőóra Szinkron",
    feat8Desc: "Tiszta fekete éjszakai óra mód percenkénti pixel-eltolással a beégés ellen, valamint a reggeli ébresztő megszólalásakor automatikus leállítás.",
    stepsTag: "Egyszerű Használat",
    stepsTitle: "Hogyan működik?",
    stepsSub: "Csak 3 lépés az esti indítástól a reggeli részletes kiértékelésig.",
    step1Title: "1. Állítsd be és Indítsd el",
    step1Desc: "Válaszd ki az elalvási idődet (pl. 15 perc), jelöld be az aznapi tényezőket, és tedd a telefont az éjjeliszekrényre.",
    step2Title: "2. Aludj nyugodtan",
    step2Desc: "A FreeSnore a háttérben figyeli a légzési hangokat, miközben a képernyőt lezárhatod vagy sötétített óra módba teheted.",
    step3Title: "3. Reggeli Elemzés",
    step3Desc: "Ébredés után azonnal megkapod a horkolási pontszámodat, az intenzitási görbét és a megosztható orvosi jelentést.",
    ctaTitle: "Készen állsz a jobb alvásra?",
    ctaSub: "Csatlakozz a nyilvános TestFlight bétához most, és próbáld ki az első éjszakán teljesen ingyen!",
    btnTestFlightCta: "TestFlight Béta Telepítése",
    footerDisclaimer: "Jogi és orvosi tájékoztató: A FreeSnore egy akusztikai alvásfigyelő eszköz, nem minősül orvosi diagnosztikai szoftvernek. Egészségügyi panaszok vagy alvási apnoe gyanúja esetén fordulj szakorvoshoz.",
    footerRights: "Minden jog fenntartva."
  },
  en: {
    navScreenshots: "Screenshots",
    navFeatures: "Features",
    navHowItWorks: "How It Works",
    navTestFlight: "TestFlight Beta",
    heroPill: "100% Free & Open-Source Snore Tracker",
    heroTitle: "Understand Your Sleep. <span class='gradient-text'>Without Paywalls.</span>",
    heroSubtitle: "FreeSnore is a premium, privacy-first snore and sleep tracking app for iOS and Android. No monthly subscriptions, no cloud audio uploads.",
    btnTestFlight: "Join TestFlight Beta",
    btnGithub: "View on GitHub",
    badgePrivate: "100% Private On-Device",
    badgeBattery: "OLED Dimmed Night Clock",
    badgeFree: "Forever Free & Open Source",
    phoneStatus: "Monitoring Sleep & Snoring",
    phoneScoreLabel: "Snore Score",
    phoneChip1: "✓ Side sleeping",
    phoneChip2: "✓ Nasal strips",
    phoneChip3: "7h 45m sleep",
    phoneBtn: "View Sleep Analysis",
    showcaseTag: "App Tour & Screenshots",
    showcaseTitle: "Explore FreeSnore in Action",
    showcaseSub: "Every tool you need to evaluate, correlate, and improve your sleep acoustics — designed for clarity without late-night visual clutter.",
    tabNightDetail: "Night Analysis",
    tabEnvironment: "Pollen & Air Quality",
    tabTrends: "Streaks & Trends",
    tabPdfPreview: "Clinical PDF Report",
    thumbTitle0: "Night Analysis",
    thumbDesc0: "Scores, timelines & audio",
    thumbTitle1: "Air & Pollen",
    thumbDesc1: "Open-Meteo weather stats",
    thumbTitle2: "Goal Streaks",
    thumbDesc2: "Weekday vs. Weekend",
    thumbTitle3: "Doctor PDF",
    thumbDesc3: "Interactive report preview",
    featuresTag: "Comprehensive Feature Suite",
    featuresTitle: "Everything Built for Quiet, Restful Nights",
    featuresSub: "From cutting-edge acoustic detection to outdoor pollen tracking, storage optimization, and clinical PDF exports.",
    feat1Title: "Acoustic Snore Detection",
    feat1Desc: "Filters ambient bedroom rustles and movement using respiratory periodicity and duration gating to isolate authentic snoring episodes.",
    feat2Title: "Fall-Asleep Delay",
    feat2Desc: "Microphone activates quietly upfront adhering to iOS background rules, while acoustic evaluation begins once you're asleep.",
    feat3Title: "Overnight Sound Timeline",
    feat3Desc: "Inspect loudness spikes and snoring duration minute-by-minute across the entire night with interactive playback and scrub bar.",
    feat4Title: "Pollen & Outdoor Air Quality",
    feat4Desc: "Correlates night-time breathing with Open-Meteo & CAMS outdoor data: tracks birch, grass, and ragweed pollen, humidity, PM2.5, and air pressure.",
    feat5Title: "Goal Streaks & Lifestyle Trends",
    feat5Desc: "Set custom quiet goals and build streaks. Analyze weekday vs. weekend patterns to see how late nights or alcohol impact your rest.",
    feat6Title: "Native Audio Compaction",
    feat6Desc: "Keeps only the snoring parts of older nights (80MB trimmed to 5-15MB) via lossless native audio trimming, keeping all your statistics intact.",
    feat7Title: "Clinical Doctor PDF Report",
    feat7Desc: "Generate clean clinical PDF reports for doctor consultations, with an in-app interactive preview before sending or printing.",
    feat8Title: "OLED Anti-Burn Night Clock & Alarm Sync",
    feat8Desc: "Pure black dimmed clock mode with minute-by-minute pixel shift to protect your OLED screen, plus automatic session finalization when your morning alarm rings.",
    stepsTag: "Effortless Setup",
    stepsTitle: "How It Works",
    stepsSub: "Only 3 steps from setting your phone down to reviewing your morning report.",
    step1Title: "1. Set Delay & Start",
    step1Desc: "Choose your fall-asleep delay (e.g., 15 mins), tap your applied factors or remedies, and place your phone on the nightstand.",
    step2Title: "2. Sleep Soundly",
    step2Desc: "FreeSnore silently tracks your nighttime sound patterns while you lock your screen or use the dimmed night clock.",
    step3Title: "3. Morning Review",
    step3Desc: "Wake up and view your Snore Score, loudness breakdown, audio snippets, and exportable doctor PDF report.",
    ctaTitle: "Ready for Better Sleep?",
    ctaSub: "Join our public TestFlight beta now and test your first night completely free!",
    btnTestFlightCta: "Install TestFlight Beta",
    footerDisclaimer: "Notice: FreeSnore is an acoustic sleep tracking tool and does not provide clinical medical diagnosis. If you suspect obstructive sleep apnea or serious sleep disorders, consult a qualified medical professional.",
    footerRights: "All rights reserved."
  }
};

let currentLang = 'en';
let activeTabIndex = 0;

function updateShowcase(index) {
  activeTabIndex = index;
  const data = showcaseData[index];
  if (!data) return;

  const mainImg = document.getElementById('showcaseMainImg');
  if (mainImg) {
    mainImg.style.opacity = '0.3';
    setTimeout(() => {
      mainImg.src = data.img;
      mainImg.alt = data.alt;
      mainImg.style.opacity = '1';
    }, 150);
  }

  const langData = data[currentLang] || data.en;
  const tagEl = document.getElementById('showcaseTag');
  const headingEl = document.getElementById('showcaseHeading');
  const descEl = document.getElementById('showcaseDesc');
  const listEl = document.getElementById('showcaseList');

  if (tagEl) tagEl.textContent = langData.tag;
  if (headingEl) headingEl.textContent = langData.heading;
  if (descEl) descEl.textContent = langData.desc;

  if (listEl) {
    listEl.innerHTML = langData.items
      .map(
        (item) => `
      <li class="showcase-feature-item">
        <span class="showcase-feature-icon">✓</span>
        <span>${item}</span>
      </li>`
      )
      .join('');
  }

  // Update tabs active state
  document.querySelectorAll('.showcase-tab').forEach((tab) => {
    tab.classList.toggle('active', parseInt(tab.getAttribute('data-tab'), 10) === index);
  });

  // Update thumbnails active state
  document.querySelectorAll('.showcase-thumb-card').forEach((card) => {
    card.classList.toggle('active', parseInt(card.getAttribute('data-tab'), 10) === index);
  });
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('freesnore_lang', lang);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      el.innerHTML = i18n[lang][key];
    }
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  document.documentElement.lang = lang;
  updateShowcase(activeTabIndex);
}

document.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('freesnore_lang');
  if (stored && (stored === 'hu' || stored === 'en')) {
    setLanguage(stored);
  } else {
    setLanguage('en');
  }

  // Language button click handlers
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLanguage(btn.getAttribute('data-lang'));
    });
  });

  // Showcase tabs click handlers
  document.querySelectorAll('.showcase-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.getAttribute('data-tab'), 10);
      updateShowcase(idx);
    });
  });

  // Showcase thumbnail click handlers
  document.querySelectorAll('.showcase-thumb-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-tab'), 10);
      updateShowcase(idx);
    });
  });
});
