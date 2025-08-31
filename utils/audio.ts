import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Recording } from '@/types/recording';
import { ensureDirectoryExists, saveRecordingMetadata } from './storage';

const RECORDINGS_DIRECTORY = `${FileSystem.documentDirectory}recordings/`;

// Audio recording settings optimized for respiratory sounds
const RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// Request audio permissions
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    return false;
  }
}

// Start recording
export async function startRecording(
  onStatusUpdate?: (status: any) => void
): Promise<Audio.Recording | null> {
  try {
    // Request permissions
    const permissionGranted = await requestAudioPermissions();
    if (!permissionGranted) {
      throw new Error('Microphone permission not granted');
    }

    // Ensure directory exists
    await ensureDirectoryExists();

    // Set audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
    });

    // Create and start recording
    const recording = new Audio.Recording();
    
    if (onStatusUpdate) {
      recording.setOnRecordingStatusUpdate(onStatusUpdate);
    }
    
    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await recording.startAsync();
    
    return recording;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
}

// Stop recording
export async function stopRecording(
  recording: Audio.Recording
): Promise<{ uri: string; duration: number } | null> {
  try {
    if (!recording) return null;

    await recording.stopAndUnloadAsync();
    
    const info = await recording.getStatusAsync();
    const uri = recording.getURI();
    
    if (!uri) {
      throw new Error('Recording URI is null');
    }

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    return {
      uri,
      duration: info.durationMillis ? Math.floor(info.durationMillis / 1000) : 0,
    };
  } catch (error) {
    console.error('Error stopping recording:', error);
    throw error;
  }
}

// Save recording to permanent storage
export async function saveRecording(recordingData: Omit<Recording, 'fileSize'>): Promise<boolean> {
  try {
    await ensureDirectoryExists();
    
    // Generate filename
    const fileName = `${recordingData.type}-${Date.now()}.m4a`;
    const destUri = `${RECORDINGS_DIRECTORY}${fileName}`;
    
    // Move file to recordings directory
    await FileSystem.moveAsync({
      from: recordingData.uri,
      to: destUri,
    });
    
    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(destUri, { size: true });
    const fileSize = 'size' in fileInfo ? fileInfo.size : 0;
    
    // Save metadata
    const completeRecording: Recording = {
      ...recordingData,
      uri: destUri,
      fileSize,
    };
    
    await saveRecordingMetadata(completeRecording);
    
    return true;
  } catch (error) {
    console.error('Error saving recording:', error);
    return false;
  }
}

// Play a recording
export async function playRecording(uri: string): Promise<Audio.Sound | null> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Audio file does not exist');
    }

    // Set audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
    });

    // Create and play sound
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    
    return sound;
  } catch (error) {
    console.error('Error playing recording:', error);
    throw error;
  }
}