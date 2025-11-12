
import { useState, useRef, useCallback } from 'react';

// Helper function to convert a Blob to a base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result is a data URL: "data:audio/webm;codecs=opus;base64,..."
      // We only need the base64 part
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface UseSpeechRecognitionProps {
  onTranscriptionComplete: (base64: string, mimeType: string) => void;
  onTranscriptionError: (error: string) => void;
}

export const useSpeechRecognition = ({ 
  onTranscriptionComplete,
  onTranscriptionError 
}: UseSpeechRecognitionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // The onstop event will handle the rest
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      audioChunksRef.current = [];
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });

      recorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        const audioBase64 = await blobToBase64(audioBlob);
        onTranscriptionComplete(audioBase64, recorder.mimeType);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      });

      recorder.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      onTranscriptionError('Microphone access denied. Please allow microphone access in your browser settings.');
      setIsRecording(false);
    }
  }, [isRecording, stopRecording, onTranscriptionComplete, onTranscriptionError]);

  return { isRecording, startRecording, stopRecording };
};
