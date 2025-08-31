import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getRecordings } from '@/utils/storage';
import { Recording } from '@/types/recording';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadRecentRecordings();
  }, []);

  const loadRecentRecordings = async () => {
    try {
      const recordings = await getRecordings();
      setRecentRecordings(recordings.slice(0, 3)); // Show only 3 most recent
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRecordingItem = ({ item }: { item: Recording }) => (
    <TouchableOpacity
      style={[styles.recordingItem, { backgroundColor: colors.background }]}
      onPress={() => router.push(`/recording/${item.id}`)}
    >
      <View style={[styles.recordingIcon, { backgroundColor: `${colors.tint}20` }]}>
        <Ionicons
          name={item.type === 'cough' ? 'medical' : 'pulse'}
          size={24}
          color={colors.tint}
        />
      </View>
      <View style={styles.recordingInfo}>
        <Text style={[styles.recordingTitle, { color: colors.text }]}>
          {item.type === 'cough' ? 'Cough Recording' : 'Breath Recording'}
        </Text>
        <Text style={[styles.recordingDate, { color: colors.icon }]}>
          {formatDate(item.createdAt)} • {formatDuration(item.duration)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.icon} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>StethoPulse</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Monitor your respiratory health
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionCard, styles.recordCard]}
            onPress={() => router.push('/(tabs)/record')}
          >
            <Ionicons name="mic" size={32} color="#fff" />
            <Text style={styles.actionCardText}>Record Cough</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/record?type=breath')}
          >
            <Ionicons name="pulse" size={32} color="#fff" />
            <Text style={styles.actionCardText}>Record Breath</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Recordings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Recordings
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={[styles.viewAllText, { color: colors.tint }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          ) : recentRecordings.length > 0 ? (
            <FlatList
              data={recentRecordings}
              renderItem={renderRecordingItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyStateText, { color: colors.icon }]}>
                No recordings yet
              </Text>
              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push('/(tabs)/record')}
              >
                <Text style={styles.recordButtonText}>Make First Recording</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Health Tips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Tips</Text>
          <View style={[styles.tipCard, { backgroundColor: colors.background }]}>
            <Ionicons name="water" size={24} color={colors.tint} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              Stay hydrated to maintain healthy respiratory function
            </Text>
          </View>
          <View style={[styles.tipCard, { backgroundColor: colors.background }]}>
            <Ionicons name="fitness" size={24} color={colors.tint} />
            <Text style={[styles.tipText, { color: colors.text }]}>
              Regular exercise improves lung capacity
            </Text>
          </View>
        </View>
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
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  recordCard: {
    backgroundColor: '#FF6B6B',
  },
  actionCardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginVertical: 20,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordingDate: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  recordButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});