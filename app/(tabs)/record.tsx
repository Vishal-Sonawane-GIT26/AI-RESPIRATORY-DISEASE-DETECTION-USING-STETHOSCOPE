import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { startRecording, stopRecording, saveRecording } from '@/utils/audio';
import { WaveformMeter } from '@/components/WaveformMeter';

export default function RecordScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const recordingType = (params.type as string) || 'cough';

  const colors = Colors[colorScheme ?? 'light'];
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  
  const recording = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recording.current) {
        recording.current.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const recordingObject = await startRecording((status) => {
        if (status.isRecording) {
          setRecordingDuration(Math.floor(status.durationMillis / 1000));
          // Simulate amplitude for visualization
          setAmplitude(Math.random() * 0.8 + 0.2);
        }
      });

      if (recordingObject) {
        recording.current = recordingObject;
        setIsRecording(true);
        setIsPaused(false);
        setRecordingDuration(0);

        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const handlePauseRecording = async () => {
    if (!recording.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (isPaused) {
        await recording.current.startAsync();
        setIsPaused(false);
        
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } else {
        await recording.current.pauseAsync();
        setIsPaused(true);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } catch (error) {
      console.error('Failed to pause/resume recording:', error);
    }
  };

  const handleStopRecording = async () => {
    if (!recording.current) return;

    try {
      setIsSaving(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const result = await stopRecording(recording.current);
      recording.current = null;

      if (result && result.uri) {
        const recordingData = {
          id: `${recordingType}-${Date.now()}`,
          uri: result.uri,
          duration: result.duration,
          type: recordingType as 'cough' | 'breath',
          createdAt: new Date().toISOString(),
          fileSize: 0,
        };

        const saved = await saveRecording(recordingData);
        
        if (saved) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.push('/(tabs)/history');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    } finally {
      setIsRecording(false);
      setIsPaused(false);
      setIsSaving(false);
      setRecordingDuration(0);
      setAmplitude(0);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Record {recordingType === 'cough' ? 'Cough' : 'Breath'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Instructions */}
      <View style={[styles.instructionsCard, { backgroundColor: colors.background }]}>
        <Ionicons name="information-circle" size={24} color={colors.tint} />
        <Text style={[styles.instructionsText, { color: colors.text }]}>
          {recordingType === 'cough' 
            ? 'Position your device 6 inches from your mouth and cough naturally'
            : 'Breathe normally and steadily for best results'
          }
        </Text>
      </View>

      {/* Visualization */}
      <View style={styles.visualizationContainer}>
        <WaveformMeter 
          amplitude={amplitude}
          isRecording={isRecording && !isPaused}
          color={colors.tint}
        />
        <Text style={[styles.timerText, { color: colors.text }]}>
          {formatTime(recordingDuration)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {isRecording ? (
          <>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.background }]}
              onPress={handlePauseRecording}
              disabled={isSaving}
            >
              <Ionicons 
                name={isPaused ? 'play' : 'pause'} 
                size={30} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={handleStopRecording}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons name="square" size={30} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, styles.recordButton]}
            onPress={handleStartRecording}
          >
            <Ionicons name="mic" size={40} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={[styles.tipsTitle, { color: colors.text }]}>Recording Tips</Text>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
          <Text style={[styles.tipText, { color: colors.text }]}>
            Find a quiet environment
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
          <Text style={[styles.tipText, { color: colors.text }]}>
            Hold device steady during recording
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
          <Text style={[styles.tipText, { color: colors.text }]}>
            Record for at least 5 seconds
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  visualizationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 20,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  recordButton: {
    backgroundColor: '#FF6B6B',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  tipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 14,
  },
});