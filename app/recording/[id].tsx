import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getRecordingById, deleteRecording } from '@/utils/storage';
import { playRecording } from '@/utils/audio';
import { Recording } from '@/types/recording';

export default function RecordingDetailScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const recordingId = params.id as string;

  const colors = Colors[colorScheme ?? 'light'];

  const [recording, setRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    loadRecording();
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [recordingId]);

  const loadRecording = async () => {
    try {
      const recordingData = await getRecordingById(recordingId);
      if (recordingData) {
        setRecording(recordingData);
      } else {
        Alert.alert('Error', 'Recording not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading recording:', error);
      Alert.alert('Error', 'Failed to load recording');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePlayPause = async () => {
    if (!recording) return;

    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      const newSound = await playRecording(recording.uri);
      
      if (newSound) {
        setSound(newSound);
        setIsPlaying(true);
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (error) {
      console.error('Error playing recording:', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const handleShare = async () => {
    if (!recording) return;

    try {
      await Share.share({
        url: recording.uri,
        title: `${recording.type} Recording - ${formatDate(recording.createdAt)}`,
      });
    } catch (error) {
      console.error('Error sharing recording:', error);
      Alert.alert('Error', 'Failed to share recording');
    }
  };

  const handleDelete = () => {
    if (!recording) return;

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
              if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
              }
              
              await deleteRecording(recording.id);
              router.back();
            } catch (error) {
              console.error('Error deleting recording:', error);
              Alert.alert('Error', 'Failed to delete recording');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!recording) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Recording not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Recording Details</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Recording Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
        <View style={[styles.recordingIcon, { backgroundColor: `${colors.tint}20` }]}>
          <Ionicons
            name={recording.type === 'cough' ? 'medical' : 'pulse'}
            size={32}
            color={colors.tint}
          />
        </View>
        
        <Text style={[styles.recordingType, { color: colors.text }]}>
          {recording.type === 'cough' ? 'Cough Recording' : 'Breath Recording'}
        </Text>
        
        <Text style={[styles.recordingDate, { color: colors.icon }]}>
          {formatDate(recording.createdAt)}
        </Text>
      </View>

      {/* Playback Controls */}
      <View style={[styles.playbackCard, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.tint }]}
          onPress={handlePlayPause}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>
        
        <Text style={[styles.playButtonText, { color: colors.text }]}>
          {isPlaying ? 'Pause' : 'Play'} Recording
        </Text>
      </View>

      {/* Recording Details */}
      <View style={[styles.detailsCard, { backgroundColor: colors.background }]}>
        <Text style={[styles.detailsTitle, { color: colors.text }]}>Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.icon }]}>Duration</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatDuration(recording.duration)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.icon }]}>File Size</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatFileSize(recording.fileSize)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.icon }]}>Type</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {recording.type === 'cough' ? 'Cough Sample' : 'Breath Sample'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          <Text style={styles.deleteButtonText}>Delete Recording</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCard: {
    alignItems: 'center',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordingType: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recordingDate: {
    fontSize: 16,
    textAlign: 'center',
  },
  playbackCard: {
    alignItems: 'center',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailsCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionsContainer: {
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});