import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SnoreClip } from '../types/session';
import { sleepMonitor } from '../services/audioService';
import { COLORS, SNORE_LEVELS } from '../constants/theme';

interface ClipPlayerProps {
  clip: SnoreClip;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export const ClipPlayer: React.FC<ClipPlayerProps> = ({ clip, onPlayingChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        sleepMonitor.stopPlayback();
      }
    };
  }, [isPlaying]);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await sleepMonitor.stopPlayback();
      setIsPlaying(false);
      onPlayingChange?.(false);
      return;
    }

    if (!clip.audioUri) {
      alert('Nincs elérhető hangfájl ehhez a részlethez.');
      return;
    }

    setIsLoading(true);
    const sound = await sleepMonitor.playClip(clip.audioUri, (status) => {
      if (status.didJustFinish) {
        setIsPlaying(false);
        onPlayingChange?.(false);
      }
    });

    setIsLoading(false);
    if (sound) {
      setIsPlaying(true);
      onPlayingChange?.(true);
    }
  };

  const levelInfo = SNORE_LEVELS[clip.category] || SNORE_LEVELS.light;

  const clipDate = new Date(clip.timestamp);
  const timeFormatted = `${clipDate.getHours().toString().padStart(2, '0')}:${clipDate
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${clipDate.getSeconds().toString().padStart(2, '0')}`;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: isPlaying ? COLORS.primary : COLORS.surfaceHighlight }]}
        onPress={handleTogglePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.textPrimary} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? '#FFFFFF' : COLORS.primaryLight}
          />
        )}
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <View style={styles.topRow}>
          <Text style={styles.timeText}>{timeFormatted}</Text>
          <View style={[styles.badge, { backgroundColor: levelInfo.color + '25', borderColor: levelInfo.color }]}>
            <Text style={[styles.badgeText, { color: levelInfo.color }]}>
              {levelInfo.label} • {clip.peakDb} dB
            </Text>
          </View>
        </View>

        <View style={styles.waveRow}>
          <View style={styles.waveBars}>
            {[4, 12, 18, 8, 22, 14, 26, 16, 10, 20, 15, 6].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: isPlaying ? ((h * 1.5) % 24) + 6 : h,
                    backgroundColor: isPlaying ? COLORS.primaryLight : COLORS.border,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.durationText}>{clip.durationSeconds}s</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  durationText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
