const { withAppBuildGradle } = require('expo/config-plugins');

// react-native-android-widget needs androidx.work 2.8.1, another dependency brings
// work-runtime-ktx 2.7.1. From 2.8 the -ktx classes live in work-runtime (the -ktx artifact is
// empty), so both on 2.7/2.8 means duplicate classes. Align -ktx with work-runtime.
const MARKER = '// FreeSnore: align androidx.work versions';

module.exports = function withWorkManagerAlignment(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += `
${MARKER}
configurations.all {
  resolutionStrategy.force 'androidx.work:work-runtime-ktx:2.8.1'
}
`;
    }
    return config;
  });
};
