import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';

interface PdfPreviewModalProps {
  visible: boolean;
  html: string | null; // The report exactly as it goes into the PDF
  isLoading?: boolean;
  isSharing?: boolean;
  onClose: () => void;
  onShare: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  visible,
  html,
  isLoading = false,
  isSharing = false,
  onClose,
  onShare,
}) => (
  <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
    {/* A modal is outside the app's provider: without its own, the insets are 0 and the
        top bar slides under the status bar */}
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityLabel={t('cancel')}
          >
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('pdfPreviewTitle')}</Text>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={onShare}
            disabled={isLoading || isSharing || !html}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityLabel={t('pdfShareReport')}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={COLORS.primaryLight} />
            ) : (
              <Ionicons name="share-outline" size={22} color={COLORS.primaryLight} />
            )}
          </TouchableOpacity>
        </View>

        {isLoading || !html ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
            <Text style={styles.loadingText}>{t('generatingPdf')}</Text>
          </View>
        ) : (
          <View style={styles.paperWrapper}>
            <WebView
              style={styles.paper}
              originWhitelist={['*']}
              source={{ html }}
              javaScriptEnabled={false}
              // Only the inline report itself; nothing in it may navigate the preview away
              onShouldStartLoadWithRequest={(request) => /^(about|data):/.test(request.url)}
            />
          </View>
        )}

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={onShare}
            disabled={isLoading || isSharing || !html}
            activeOpacity={0.85}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="share-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.shareBtnText}>{t('pdfShareReport')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  topBarBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paperWrapper: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 12,
  },
  paper: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
