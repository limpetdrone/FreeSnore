import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t, getLanguage } from '../i18n';
import { buildPeriodReportHtml, ReportPeriod, sessionsInPeriod } from '../services/pdfReportGenerator';
import { usePdfReport } from '../hooks/usePdfReport';
import { PdfPreviewModal } from './PdfPreviewModal';

type Preset = 'week' | 'month' | 'custom';

const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
const lastDays = (days: number): ReportPeriod => ({ from: addDays(today(), -(days - 1)), to: today() });

const formatDay = (d: Date) =>
  d.toLocaleDateString(getLanguage() === 'hu' ? 'hu-HU' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

interface DayStepperProps {
  label: string;
  value: Date;
  min?: Date;
  max?: Date;
  onChange: (d: Date) => void;
}

/** Day picker without a native date picker: steps by a day, long press steps by a week. */
const DayStepper: React.FC<DayStepperProps> = ({ label, value, min, max, onChange }) => {
  const step = (days: number) => {
    let next = addDays(value, days);
    if (min && next < min) next = min;
    if (max && next > max) next = max;
    onChange(next);
  };
  const atMin = !!min && value.getTime() <= min.getTime();
  const atMax = !!max && value.getTime() >= max.getTime();
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepBtn, atMin && styles.stepBtnDisabled]}
          onPress={() => step(-1)}
          onLongPress={() => step(-7)}
          disabled={atMin}
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{formatDay(value)}</Text>
        <TouchableOpacity
          style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
          onPress={() => step(1)}
          onLongPress={() => step(7)}
          disabled={atMax}
          hitSlop={6}
        >
          <Ionicons name="chevron-forward" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface PeriodReportPanelProps {
  sessions: SleepSession[];
}

/** Report over a week, a month or a chosen period, previewed and shared as a PDF. */
export const PeriodReportPanel: React.FC<PeriodReportPanelProps> = ({ sessions }) => {
  const [expanded, setExpanded] = useState(false);
  const [preset, setPreset] = useState<Preset>('week');
  const [custom, setCustom] = useState<ReportPeriod>(() => lastDays(7));
  const report = usePdfReport();

  const period = preset === 'week' ? lastDays(7) : preset === 'month' ? lastDays(30) : custom;
  const nightCount = sessionsInPeriod(sessions, period).length;

  const earliest = useMemo(() => {
    if (sessions.length === 0) return undefined;
    const first = new Date(Math.min(...sessions.map((s) => new Date(s.startTime).getTime())));
    return new Date(first.getFullYear(), first.getMonth(), first.getDate());
  }, [sessions]);

  const presets: { key: Preset; label: string }[] = [
    { key: 'week', label: t('periodLastWeek') },
    { key: 'month', label: t('periodLastMonth') },
    { key: 'custom', label: t('periodCustom') },
  ];

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.headerRow} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
        <Ionicons name="document-text-outline" size={20} color={COLORS.primaryLight} />
        <Text style={styles.title}>{t('periodReportButton')}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.presetRow}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.presetBtn, preset === p.key && styles.presetBtnActive]}
                onPress={() => setPreset(p.key)}
              >
                <Text style={[styles.presetText, preset === p.key && styles.presetTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {preset === 'custom' && (
            <View style={styles.customBox}>
              <DayStepper
                label={t('periodFrom')}
                value={custom.from}
                min={earliest && earliest < custom.to ? earliest : undefined}
                max={custom.to}
                onChange={(from) => setCustom((c) => ({ ...c, from }))}
              />
              <DayStepper
                label={t('periodTo')}
                value={custom.to}
                min={custom.from}
                max={today()}
                onChange={(to) => setCustom((c) => ({ ...c, to }))}
              />
            </View>
          )}

          <Text style={styles.rangeText}>
            {formatDay(period.from)} – {formatDay(period.to)} ·{' '}
            {t('periodNightsFound', { count: nightCount })}
          </Text>

          <TouchableOpacity
            style={[styles.createBtn, nightCount === 0 && styles.createBtnDisabled]}
            disabled={nightCount === 0}
            onPress={() => report.open(buildPeriodReportHtml(sessions, period))}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.createBtnText}>{t('periodCreate')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <PdfPreviewModal
        visible={report.visible}
        html={report.html}
        isSharing={report.isSharing}
        onClose={report.close}
        onShare={report.share}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetBtnActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  presetText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  customBox: {
    marginTop: 12,
    gap: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
  rangeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
  createBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnDisabled: {
    opacity: 0.45,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
