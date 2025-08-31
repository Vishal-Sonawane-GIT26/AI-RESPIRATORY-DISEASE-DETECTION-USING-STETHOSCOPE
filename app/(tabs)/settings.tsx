import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { clearAllRecordings } from '@/utils/storage';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [highQualityRecording, setHighQualityRecording] = useState(false);

  const handleClearAllRecordings = () => {
    Alert.alert(
      'Clear All Recordings',
      'Are you sure you want to delete all recordings? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllRecordings();
              Alert.alert('Success', 'All recordings have been cleared');
            } catch (error) {
              console.error('Error clearing recordings:', error);
              Alert.alert('Error', 'Failed to clear recordings');
            }
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About StethoPulse',
      'Version 1.0.0\n\nA respiratory health monitoring app that helps you track and analyze your cough and breathing patterns.\n\nDeveloped with Expo and React Native.',
      [{ text: 'OK' }]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    rightComponent?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.background }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${colors.tint}20` }]}>
          <Ionicons name={icon as any} size={20} color={colors.tint} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.icon }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent || (
        onPress && <Ionicons name="chevron-forward" size={20} color={colors.icon} />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.icon }]}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        {/* Recording Settings */}
        {renderSection(
          'RECORDING',
          <>
            {renderSettingItem(
              'save-outline',
              'Auto-save recordings',
              'Automatically save recordings after stopping',
              <Switch
                value={autoSaveEnabled}
                onValueChange={setAutoSaveEnabled}
                trackColor={{ false: '#E5E5E5', true: colors.tint }}
                thumbColor="#fff"
              />
            )}
            {renderSettingItem(
              'musical-notes-outline',
              'High quality recording',
              'Use higher bitrate for better audio quality',
              <Switch
                value={highQualityRecording}
                onValueChange={setHighQualityRecording}
                trackColor={{ false: '#E5E5E5', true: colors.tint }}
                thumbColor="#fff"
              />
            )}
          </>
        )}

        {/* Notifications */}
        {renderSection(
          'NOTIFICATIONS',
          renderSettingItem(
            'notifications-outline',
            'Push notifications',
            'Get reminders to record regularly',
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E5E5', true: colors.tint }}
              thumbColor="#fff"
            />
          )
        )}

        {/* Data Management */}
        {renderSection(
          'DATA',
          <>
            {renderSettingItem(
              'cloud-upload-outline',
              'Export recordings',
              'Export all recordings to external storage',
              undefined,
              () => Alert.alert('Coming Soon', 'Export feature will be available in a future update')
            )}
            {renderSettingItem(
              'trash-outline',
              'Clear all recordings',
              'Delete all stored recordings',
              undefined,
              handleClearAllRecordings
            )}
          </>
        )}

        {/* App Info */}
        {renderSection(
          'ABOUT',
          <>
            {renderSettingItem(
              'information-circle-outline',
              'About StethoPulse',
              'App version and information',
              undefined,
              handleAbout
            )}
            {renderSettingItem(
              'help-circle-outline',
              'Help & Support',
              'Get help using the app',
              undefined,
              () => Alert.alert('Help', 'For support, please contact: support@stethopulse.com')
            )}
            {renderSettingItem(
              'shield-checkmark-outline',
              'Privacy Policy',
              'View our privacy policy',
              undefined,
              () => Alert.alert('Privacy', 'Your recordings are stored locally on your device and are not shared with third parties.')
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionContent: {
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
});