import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getRecordings, deleteRecording } from '@/utils/storage';
import { playRecording } from '@/utils/audio';
import { Recording } from '@/types/recording';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const colors = Colors[colorScheme ?? 'light'];

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'cough' | 'breath'>('all');

  useFocusEffect(
    useCallback(() => {
      loadRecordings();
    }, [])
  );

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadRecordings = async () => {
    try {
      const allRecordings = await getRecordings();
      setRecordings(allRecordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
      Alert.alert('Error', 'Failed to load recordings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRecordings();
  };

  const filteredRecordings = recordings.filter(recording => {
    if (filterType === 'all') return true;
    return recording.type === filterType;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayRecording = async (recording: Recording) => {
    try {
      if (playingId === recording.id && sound) {
        await sound.stopAsync();
        setPlayingId(null);
        setSound(null);
        return;
      }

      if (sound) {
        await sound.stopAsync();
        setSound(null);
      }

      const newSound = await playRecording(recording.uri);
      
      if (newSound) {
        setSound(newSound);
        setPlayingId(recording.id);
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null);
          }
        });
      }
    } catch (error) {
      console.error('Error playing recording:', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const handleDeleteRecording = (recording: Recording) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (playingId === recording.id && sound) {
                await sound.stopAsync();
                setSound(null);
                setPlayingId(null);
              }
              
              await deleteRecording(recording.id);
              setRecordings(prev => prev.filter(r => r.id !== recording.id));
            } catch (error) {
              console.error('Error deleting recording:', error);
              Alert.alert('Error', 'Failed to delete recording');
            }
          },
        },
      ]
    );
  };

  const renderFilterButton = (type: 'all' | 'cough' | 'breath', label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && { backgroundColor: colors.tint },
      ]}
      onPress={() => setFilterType(type)}
    >
      <Text
        style={[
          styles.filterText,
          { color: filterType === type ? '#fff' : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRecordingItem = ({ item }: { item: Recording }) => {
    const isPlaying = playingId === item.id;

    return (
      <View style={[styles.recordingItem, { backgroundColor: colors.background }]}>
        <View style={styles.recordingHeader}>
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
              {formatDate(item.createdAt)}
            </Text>
            <Text style={[styles.recordingDuration, { color: colors.icon }]}>
              Duration: {formatDuration(item.duration)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlayRecording(item)}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={32}
              color={colors.tint}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteRecording(item)}
          >
            <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="medical-outline" size={64} color={colors.icon} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        No Recordings Yet
      </Text>
      <Text style={[styles.emptyStateDescription, { color: colors.icon }]}>
        Start by recording your first {filterType === 'all' ? 'cough or breath' : filterType} sample
      </Text>
      <TouchableOpacity
        style={[styles.recordButton, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/(tabs)/record')}
      >
        <Text style={styles.recordButtonText}>Record Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Recording History</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('cough', 'Cough')}
        {renderFilterButton('breath', 'Breath')}
      </View>

      {/* Recordings List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredRecordings}
          renderItem={renderRecordingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  recordingItem: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 2,
  },
  recordingDuration: {
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
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
});