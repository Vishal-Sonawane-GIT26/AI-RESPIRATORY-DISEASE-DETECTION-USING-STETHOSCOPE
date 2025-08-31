import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

interface WaveformMeterProps {
  amplitude: number;
  isRecording: boolean;
  color: string;
}

export function WaveformMeter({ amplitude, isRecording, color }: WaveformMeterProps) {
  const [levels, setLevels] = useState<number[]>([]);
  const maxBars = 40;

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        // Generate realistic waveform data based on amplitude
        const newLevel = amplitude * 100 + Math.random() * 20;
        setLevels(prev => {
          const updated = [...prev, newLevel];
          if (updated.length > maxBars) {
            return updated.slice(updated.length - maxBars);
          }
          return updated;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setLevels([]);
    }
  }, [isRecording, amplitude]);

  return (
    <View style={styles.container}>
      <View style={styles.waveform}>
        {Array.from({ length: maxBars }).map((_, index) => {
          const level = levels[index] || 0;
          const height = Math.max(4, Math.min(80, level));
          
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: isRecording ? color : '#E5E5E5',
                  opacity: isRecording ? 1 : 0.5,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 80,
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
});