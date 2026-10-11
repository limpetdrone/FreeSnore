import { Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetData } from './widgetData';

// iOS home screen widget: last night's score. Runs in the widget's own runtime: no imports
// beyond the UI components, no app state; everything arrives in the props.
const LastNightWidget = (props: WidgetData, environment: WidgetEnvironment) => {
  'widget';
  const small = environment.widgetFamily === 'systemSmall';
  return (
    <VStack modifiers={[containerBackground('#15192C', 'widget')]}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#94A3B8')]}>
        {props.hasNight ? props.date : props.title}
      </Text>
      <Spacer />
      {props.hasNight ? (
        <VStack>
          <Text modifiers={[font({ size: small ? 40 : 46, weight: 'heavy', design: 'rounded' }), foregroundStyle(props.scoreColor)]}>
            {props.score}
          </Text>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle('#F8FAFC')]}>{props.snore}</Text>
          {props.streak ? (
            <Text modifiers={[font({ size: 11 }), foregroundStyle('#FBBF24')]}>{props.streak}</Text>
          ) : null}
        </VStack>
      ) : (
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#F8FAFC')]}>{props.empty}</Text>
      )}
      <Spacer />
    </VStack>
  );
};

export default createWidget('LastNightWidget', LastNightWidget);
