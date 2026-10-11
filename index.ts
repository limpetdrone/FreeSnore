import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Android renders the home screen widget from a background task
if (Platform.OS === 'android' && widgetTaskHandler) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Android-only native module
  require('react-native-android-widget').registerWidgetTaskHandler(widgetTaskHandler);
}
