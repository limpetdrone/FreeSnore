import { describe, expect, it } from '@jest/globals';
import { resolveAppFileUri } from '../appFiles';

const ios = (uuid: string) => `file:///var/mobile/Containers/Data/Application/${uuid}/Documents/`;

describe('resolveAppFileUri', () => {
  it('moves a recording from the container before an iOS app update to the current one', () => {
    expect(resolveAppFileUri(`${ios('OLD-UUID')}ExpoAudio/recording-1.m4a`, ios('NEW-UUID'))).toBe(
      `${ios('NEW-UUID')}ExpoAudio/recording-1.m4a`
    );
  });

  it('keeps URIs that are already current or not app files', () => {
    const current = `${ios('NEW-UUID')}recording-1.m4a`;
    expect(resolveAppFileUri(current, ios('NEW-UUID'))).toBe(current);
    expect(resolveAppFileUri('sample_audio_1', ios('NEW-UUID'))).toBe('sample_audio_1');
    expect(resolveAppFileUri('file:///tmp/other.m4a', ios('NEW-UUID'))).toBe('file:///tmp/other.m4a');
  });

  it('works with the Android files directory', () => {
    const docs = 'file:///data/user/0/com.limpetdrone.freesnore/files/';
    expect(resolveAppFileUri('file:///data/user/0/com.limpetdrone.freesnore/files/rec.m4a', docs)).toBe(
      `${docs}rec.m4a`
    );
  });
});
