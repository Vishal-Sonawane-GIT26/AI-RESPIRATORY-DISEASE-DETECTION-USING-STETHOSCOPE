import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Recording } from '@/types/recording';

const RECORDINGS_KEY = 'stethopulse_recordings';
const RECORDINGS_DIRECTORY = `${FileSystem.documentDirectory}recordings/`;

// Ensure recordings directory exists
export async function ensureDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIRECTORY, { intermediates: true });
  }
}

// Save recording metadata to AsyncStorage
export async function saveRecordingMetadata(recording: Recording): Promise<void> {
  try {
    const existingRecordings = await getRecordings();
    const updatedRecordings = [recording, ...existingRecordings];
    await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updatedRecordings));
  } catch (error) {
    console.error('Error saving recording metadata:', error);
    throw error;
  }
}

// Get all recordings from AsyncStorage
export async function getRecordings(): Promise<Recording[]> {
  try {
    const recordingsJson = await AsyncStorage.getItem(RECORDINGS_KEY);
    if (!recordingsJson) return [];
    
    const recordings: Recording[] = JSON.parse(recordingsJson);
    
    // Verify files still exist and filter out missing ones
    const validRecordings: Recording[] = [];
    
    for (const recording of recordings) {
      const fileInfo = await FileSystem.getInfoAsync(recording.uri);
      if (fileInfo.exists) {
        validRecordings.push(recording);
      }
    }
    
    // Update storage if we filtered out any recordings
    if (validRecordings.length !== recordings.length) {
      await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(validRecordings));
    }
    
    return validRecordings.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting recordings:', error);
    return [];
  }
}

// Get a single recording by ID
export async function getRecordingById(id: string): Promise<Recording | null> {
  try {
    const recordings = await getRecordings();
    return recordings.find(recording => recording.id === id) || null;
  } catch (error) {
    console.error('Error getting recording by ID:', error);
    return null;
  }
}

// Delete a recording
export async function deleteRecording(id: string): Promise<void> {
  try {
    const recordings = await getRecordings();
    const recordingToDelete = recordings.find(r => r.id === id);
    
    if (recordingToDelete) {
      // Delete the file
      const fileInfo = await FileSystem.getInfoAsync(recordingToDelete.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(recordingToDelete.uri);
      }
      
      // Update metadata
      const updatedRecordings = recordings.filter(r => r.id !== id);
      await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updatedRecordings));
    }
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }
}

// Clear all recordings
export async function clearAllRecordings(): Promise<void> {
  try {
    const recordings = await getRecordings();
    
    // Delete all files
    for (const recording of recordings) {
      const fileInfo = await FileSystem.getInfoAsync(recording.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(recording.uri);
      }
    }
    
    // Clear metadata
    await AsyncStorage.removeItem(RECORDINGS_KEY);
  } catch (error) {
    console.error('Error clearing all recordings:', error);
    throw error;
  }
}

// Update recording metadata
export async function updateRecording(id: string, updates: Partial<Recording>): Promise<void> {
  try {
    const recordings = await getRecordings();
    const updatedRecordings = recordings.map(recording =>
      recording.id === id ? { ...recording, ...updates } : recording
    );
    await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updatedRecordings));
  } catch (error) {
    console.error('Error updating recording:', error);
    throw error;
  }
}