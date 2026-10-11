# FreeSnore 🌙

[![Website](https://img.shields.io/badge/Website-limpetdrone.github.io%2FFreeSnore-indigo)](https://limpetdrone.github.io/FreeSnore/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-black)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org)

**FreeSnore** is a 100% free, privacy-first, open-source snore and sleep tracking mobile application for iOS (TestFlight) and Android. All audio analysis and processing happens directly on your device — no paywalls, no recurring subscriptions, and no cloud audio uploads.

🌐 **Website & Documentation:** [https://limpetdrone.github.io/FreeSnore/](https://limpetdrone.github.io/FreeSnore/)

---

## 🚀 Key Features

1. **⏱️ Customizable Fall-Asleep Delay**
   - Configurable countdown (0, 5, 10, 15, 20, 30, 45 minutes) so monitoring only starts once you are truly asleep.
   - Microphone initializes smoothly adhering to iOS background audio guidelines.

2. **🎙️ Acoustic Snore Detection & Real-time Analysis**
   - Real-time sound loudness measurement (dB SPL).
   - Intensity categories:
     - 🟢 **Quiet** (< 40 dB)
     - 🟡 **Light Snoring** (40 – 52 dB)
     - 🟠 **Loud Snoring** (52 – 68 dB)
     - 🔴 **Epic Snoring** (> 68 dB)
   - Weighted composite **Snore Score** calculation balancing snoring duration and severity.

3. **🔊 Audio Snippet Playback & Replay**
   - Automatically captures highlighted snore audio samples across the night.
   - Built-in interactive audio player with waveform indicator, precise timestamps, and sharing.

4. **📊 Daily, Weekly & Monthly Analytics**
   - **Night View:** Interactive minute-by-minute timeline chart, peak volume, sleep duration, and snore ratio.
   - **Weekly Trends:** 7-day bar chart showing score trends and daily averages.
   - **Monthly Trends:** 30-day overview with weekly breakdowns and correlation analysis with sleeping factors/remedies.

5. **🌿 Environmental & Sleep Factors Tracking**
   - Track aggravating factors (sleeping on back, alcohol, nasal congestion) and remedies (side sleeping, nasal strips, anti-snore pillow).
   - Optional outdoor environmental integration (pollen levels, humidity, temperature, air pressure via Open-Meteo).

6. **📄 Clinical Medical PDF Export with In-App Preview**
   - Generates clean clinical-grade sleep summary reports for doctor consultations.
   - Interactive in-app preview before exporting or sharing.

7. **🌙 OLED Anti-Burn Night Clock**
   - Pure-black, dimmed bedside clock with subtle minute-by-minute pixel shifts to prevent screen burn-in while conserving battery overnight.

8. **💾 Native Audio Compaction**
   - Native module (`modules/audio-segments`) automatically trims old full-night recordings to keep only snoring episodes after a set number of days (saving ~80% disk space).

---

## 🛠️ Tech Stack

- **Framework:** React Native + Expo (SDK 57)
- **Language:** TypeScript
- **Audio & Files:** `expo-audio`, `expo-file-system`, custom native `modules/audio-segments`
- **Data Storage:** `@react-native-async-storage/async-storage`
- **UI & Graphics:** `react-native-svg`, `@expo/vector-icons`, `expo-haptics`
- **Reporting:** `expo-print`, `expo-sharing`
- **Localization:** Hungarian & English (`i18n`)

---

## 📱 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Xcode (for iOS simulator / build) or Android Studio (for Android emulator)

### Installation

```bash
# Clone the repository
git clone https://github.com/limpetdrone/FreeSnore.git
cd FreeSnore

# Install dependencies
npm install

# Run unit tests
npm test

# Check TypeScript types
npx tsc --noEmit

# Start Expo development server
npm start
```

### Running on Simulators

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

---

## 🚀 Building for TestFlight (iOS)

The project is preconfigured with EAS for TestFlight builds:
- **Bundle Identifier:** `com.limpetdrone.freesnore`
- **Background Modes:** `UIBackgroundModes: ["audio"]`
- **Permissions:** Compliant microphone usage descriptions for App Store review.

```bash
# 1. Install EAS CLI and login
npm install -g eas-cli
eas login

# 2. Build for production (TestFlight)
eas build --platform ios --profile production --auto-submit
```

---

## 🛡️ Privacy & Medical Disclaimer

- **Privacy First:** 100% of your audio data stays on your local device. We never collect or transmit audio or health data to external cloud servers.
- **Medical Notice:** FreeSnore is an acoustic sleep tracking application designed for personal wellness and awareness. It is not an FDA/CE approved diagnostic medical device. If you suspect obstructive sleep apnea (OSA) or experience persistent breathing interruptions, please consult a qualified healthcare specialist.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
