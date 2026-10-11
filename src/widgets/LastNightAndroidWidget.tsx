import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetData } from './widgetData';

/** Android home screen widget: last night's score. Tapping it opens the app. */
export function LastNightAndroidWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#15192C',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget text={data.hasNight ? data.date : data.title} style={{ fontSize: 12, color: '#94A3B8' }} />
      {data.hasNight ? (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={data.score} style={{ fontSize: 40, fontWeight: '800', color: data.scoreColor as `#${string}` }} />
          <TextWidget text={data.snore} style={{ fontSize: 12, color: '#F8FAFC' }} />
          {data.streak ? <TextWidget text={data.streak} style={{ fontSize: 11, color: '#FBBF24' }} /> : null}
        </FlexWidget>
      ) : (
        <TextWidget text={data.empty} style={{ fontSize: 13, color: '#F8FAFC' }} />
      )}
    </FlexWidget>
  );
}
