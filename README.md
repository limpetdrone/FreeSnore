# FreeSnore 🌙

A **FreeSnore** egy nyílt forráskódú, modern horkolásfigyelő és alváselemző mobilalkalmazás iOS (TestFlight) és Android platformokra, a népszerű **SnoreLab** koncepciója alapján.

---

## 🚀 Főbb Funkciók

1. **⏱️ Testreszabható Indítási Késleltetés (Elalvási idő)**
   - Beállítható, hogy az indítás után hány perc múlva kezdődjön a tényleges mikrofonos rögzítés (pl. 0, 5, 10, 15, 20, 30, 45 perc).
   - Visszaszámláló kijelző azonnali indítási lehetőséggel.

2. **🎙️ Horkolás Érzékelés és Valós Idejű Akusztikai Elemzés**
   - Valós idejű zajszintmérés (dB SPL).
   - Intenzitás kategóriák:
     - 🟢 **Csendes** (< 40 dB)
     - 🟡 **Halk horkolás** (40 - 52 dB)
     - 🟠 **Hangos horkolás** (52 - 68 dB)
     - 🔴 **Erős / Epic horkolás** (> 68 dB)
   - SnoreLab-szerű összetett **Horkolási Pontszám (Snore Score)** számítás.

3. **🔊 Horkolások Visszahallgatása**
   - A kirívó horkolási epizódokból hangminták rögzítése.
   - Beépített audio lejátszó hullámforma indikátorral és pontos időbélyegzővel.

4. **📊 Napi, Heti és Havi Bontású Visszatekintés**
   - **Napi nézet**: Részletes éjszakai idővonal (interaktív oszlopdiagram), csúcs hangerő, alvásidő, horkolás megoszlási arány.
   - **Heti nézet**: 7 napos oszlopdiagram a horkolási pontszámok alakulásáról, heti átlag és trendek.
   - **Havi nézet**: 30 napos áttekintés, heti bontások, valamint kiváltó tényezők (alkohol, alvási pozíció, orrdugulás) hatásvizsgálata.

5. **🌙 Éjszakai Óra Mód (OLED kímélő)**
   - Sötétített, minimális fogyasztású órakijelző, amely ébren tartja az alkalmazást háttérzaj-figyelés közben anélkül, hogy zavarná az alvást.

---

## 🛠️ Technológiai Stack

- **Framework**: React Native + Expo (SDK 57)
- **Nyelv**: TypeScript
- **Hangkezelés & Mérés**: `expo-audio`, `expo-file-system`
- **Adattárolás**: `@react-native-async-storage/async-storage`
- **UI & Ikonok**: `react-native-svg`, `@expo/vector-icons`, `expo-haptics`

---

## 📱 Futtatás Fejlesztői Környezetben

A projekt könyvtárában (`/Users/davidpoka/git/FreeSnore`):

```bash
# Függőségek ellenőrzése
npm install

# TypeScript típusellenőrzés
npx tsc --noEmit

# Alkalmazás indítása Expo-val
npm start

# iOS szimulátor indítása
npm run ios

# Android emulátor indítása
npm run android
```

---

## 🚀 Telepítés TestFlight-ra (iOS)

Az alkalmazás `app.json` fájlja előre konfigurálva van az iOS háttérhang- és mikrofonengedélyekkel:
- `bundleIdentifier`: `com.limpetdrone.freesnore`
- `NSMicrophoneUsageDescription`: Felvételi engedély indoklás TestFlight auditáláshoz
- `UIBackgroundModes`: `["audio"]`

### EAS Build használatával:
```bash
# 1. EAS CLI telepítése és bejelentkezés
npm install -g eas-cli
eas login

# 2. Projekt inicializálása EAS-ban
eas build:configure

# 3. TestFlight build készítése
eas build --platform ios --profile production --auto-submit
```
