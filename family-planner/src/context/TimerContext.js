import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const TimerContext = createContext();

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
};

export const TimerProvider = ({ children }) => {
  const [duration, setDuration] = useState(0); // Total duration in seconds
  const [remainingTime, setRemainingTime] = useState(0); // Remaining time in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  // Loxone Audio Player UUID (Kitchen audio zone)
  const LOXONE_AUDIO_UUID = '208f8107-0374-807a-ffffe1193ce27325';

  // Play Loxone audio
  const playLoxoneAudio = async () => {
    try {
      await api.playLoxoneAudio(LOXONE_AUDIO_UUID);
      console.log('Loxone audio bell triggered');
    } catch (error) {
      console.error('Failed to play Loxone audio:', error);
    }
  };

  // Play repeating alarm sound
  const playAlarmSound = () => {
    let count = 0;
    const maxBeeps = 10; // Play 10 beeps
    
    const playBeep = () => {
      if (count >= maxBeeps) {
        if (alarmIntervalRef.current) {
          clearInterval(alarmIntervalRef.current);
        }
        return;
      }
      
      // Create oscillator for beep sound
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure alarm sound (higher pitched, alternating tones)
        oscillator.frequency.value = count % 2 === 0 ? 880 : 1046.5; // A5 and C6
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        count++;
      } catch (error) {
        console.log('Could not play alarm sound:', error);
      }
    };
    
    // Play first beep immediately
    playBeep();
    
    // Then play remaining beeps every 500ms
    alarmIntervalRef.current = setInterval(playBeep, 500);
  };

  // Countdown logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        
        setRemainingTime(remaining);
        
        if (remaining === 0) {
          // Timer finished
          clearInterval(intervalRef.current);
          setIsRunning(false);
          setIsPaused(false);
          
          // Play Loxone audio bell
          playLoxoneAudio();
          
          // Also play browser alarm sound as backup
          playAlarmSound();
        }
      }, 100); // Update every 100ms for smooth countdown
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, isPaused]);

  const startTimer = useCallback((seconds) => {
    if (seconds <= 0) return;
    
    setDuration(seconds);
    setRemainingTime(seconds);
    setIsRunning(true);
    setIsPaused(false);
    endTimeRef.current = Date.now() + seconds * 1000;
  }, []);

  const pauseTimer = useCallback(() => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRunning, isPaused]);

  const resumeTimer = useCallback(() => {
    if (isRunning && isPaused) {
      setIsPaused(false);
      endTimeRef.current = Date.now() + remainingTime * 1000;
    }
  }, [isRunning, isPaused, remainingTime]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setRemainingTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
    }
  }, []);

  const resetTimer = useCallback(() => {
    setRemainingTime(duration);
    setIsPaused(false);
    endTimeRef.current = Date.now() + duration * 1000;
  }, [duration]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const value = {
    duration,
    remainingTime,
    isRunning,
    isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    formatTime
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
