/**
 * Voice & Audio Service for TB-MECH Voice.
 * Full implementation integrating:
 * 1. Web MediaRecorder for real microphone audio capture with AudioContext waveform frequency analysis
 * 2. Browser SpeechRecognition for live streaming transcripts (when permitted)
 * 3. Backend /api/voice/transcribe integration (Prisma STT)
 * 4. Dual-mode Text-to-Speech (Web Speech API + Timbre /api/voice/speak audio fallback)
 */

import { INDIAN_LANGUAGES, ALIAS_MAP, VARIANTS } from '../data/kbData';
import { parseVariants, CandidateVariant } from './normalizer';

// Type declaration for Web Speech API in browsers
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Normalizes spoken mutation phrases into canonical candidate strings
 */
export function parseSpokenMutations(transcript: string): string[] {
  if (!transcript || !transcript.trim()) return [];
  const parsed = parseVariants(transcript);
  return parsed.candidates.map(c => `${c.gene} ${c.variant}`);
}

/**
 * Robust Audio Recorder & Voice Controller
 */
export class AudioCaptureService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private recognition: any = null;
  public isRecording = false;
  private isStopping = false;

  public isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Start recording audio from microphone
   */
  public async startRecording(options: {
    languageCode: string;
    onLiveTranscript: (text: string) => void;
    onWaveformUpdate: (bars: number[]) => void;
    onError: (err: string) => void;
    onComplete: (data: { text: string; candidates: CandidateVariant[]; source: string }) => void;
  }): Promise<boolean> {
    this.audioChunks = [];
    this.isStopping = false;
    let liveTranscript = '';

    // 1. Try accessing microphone
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser environment.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (err: any) {
      console.warn('Microphone access warning:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      options.onError(
        isDenied
          ? 'Microphone permission was denied by your browser. Please allow microphone access.'
          : (err.message || 'Could not access audio input device.')
      );
      return false;
    }

    // 2. Setup Web Audio Analyser for genuine live waveform meters
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        const updateWaveform = () => {
          if (!this.isRecording || !this.analyser) return;
          this.analyser.getByteFrequencyData(freqData);

          // Sample 10 frequency bands
          const bars: number[] = [];
          const step = Math.max(1, Math.floor(freqData.length / 10));
          for (let i = 0; i < 10; i++) {
            const val = freqData[i * step] || 0;
            // Map 0-255 to 8-44 px
            const height = Math.max(8, Math.min(44, Math.floor((val / 255) * 36) + 8));
            bars.push(height);
          }
          options.onWaveformUpdate(bars);
          this.animFrameId = requestAnimationFrame(updateWaveform);
        };
        this.animFrameId = requestAnimationFrame(updateWaveform);
      }
    } catch (audioCtxErr) {
      console.warn('AudioContext setup skipped:', audioCtxErr);
    }

    // 3. Setup MediaRecorder
    let activeMimeType = 'audio/webm';
    try {
      activeMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: activeMimeType });
      this.mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: activeMimeType });
        await this.handleRecordingFinished(audioBlob, liveTranscript, options.languageCode, options.onComplete);
      };

      this.mediaRecorder.start(250); // Record in 250ms chunks
      this.isRecording = true;
    } catch (recErr: any) {
      options.onError(recErr.message || 'MediaRecorder failed to initialize.');
      this.cleanUpResources();
      return false;
    }

    // 4. Instantiate a FRESH SpeechRecognition instance per recording session
    const SpeechRec = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.lang = options.languageCode || 'en-IN';

        rec.onresult = (e: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = 0; i < e.results.length; i++) {
            const piece = e.results[i][0]?.transcript?.trim();
            if (!piece) continue;
            if (e.results[i].isFinal) {
              finalTranscript += (finalTranscript ? ' ' : '') + piece;
            } else {
              interimTranscript += (interimTranscript ? ' ' : '') + piece;
            }
          }
          const full = (finalTranscript + ' ' + interimTranscript).trim();
          if (full) {
            liveTranscript = full;
            options.onLiveTranscript(full);
          }
        };

        rec.onerror = (e: any) => {
          console.warn('SpeechRecognition notice:', e.error);
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            options.onError('Browser speech recognition not permitted. Please check microphone permissions.');
          }
        };

        rec.onend = () => {
          // Restart if still active and not stopping
          if (this.isRecording && !this.isStopping && this.recognition === rec) {
            try {
              rec.start();
            } catch {
              // ignore
            }
          }
        };

        rec.start();
        this.recognition = rec;
      } catch (recErr) {
        console.warn('SpeechRecognition init skipped:', recErr);
        this.recognition = null;
      }
    }

    return true;
  }

  /**
   * Stop recording and process captured audio with trailing grace window
   */
  public stopRecording() {
    if (!this.isRecording || this.isStopping) return;
    this.isStopping = true;
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Stop recognition to trigger final onresult
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    // Delay stopping MediaRecorder by 350ms to allow recognition IPC to deliver trailing tokens
    setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch {
          this.cleanUpResources();
        }
      } else {
        this.cleanUpResources();
      }
    }, 350);
  }

  private cleanUpResources() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.recognition = null;
    this.isRecording = false;
    this.isStopping = false;
  }

  private async handleRecordingFinished(
    audioBlob: Blob,
    capturedText: string,
    languageCode: string,
    onComplete: (data: { text: string; candidates: CandidateVariant[]; source: string }) => void
  ) {
    this.cleanUpResources();

    const finalText = capturedText.trim();

    // 1. If client captured transcript with recognized candidate variants, return immediately
    if (finalText) {
      const parsed = parseVariants(finalText);
      if (parsed.candidates.length > 0) {
        onComplete({
          text: finalText,
          candidates: parsed.candidates,
          source: 'Web Speech API + Prisma Normalizer'
        });
        return;
      }
    }

    // 2. If client had no variants parsed or Web Speech API was unavailable,
    // send audioBlob base64 to backend /api/voice/transcribe for Gnani Prisma STT
    let audioBase64: string | undefined = undefined;
    if (audioBlob && audioBlob.size > 0) {
      try {
        audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resStr = reader.result as string;
            const b64 = resStr.includes(',') ? resStr.split(',')[1] : resStr;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
      } catch (b64Err) {
        console.warn('Base64 audio serialization skipped:', b64Err);
      }
    }

    try {
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language_code: languageCode,
          transcript: finalText || undefined,
          audio_base64: audioBase64,
          mime_type: audioBlob.type || 'audio/webm'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim()) {
          const finalCandidates = data.parsed?.candidates || parseVariants(data.text).candidates;
          onComplete({
            text: data.text,
            candidates: finalCandidates,
            source: data.source || 'Gnani Prisma v2.5'
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Backend transcribe fallback error:', err);
    }

    // 3. If backend returned nothing but client had some text, show client text
    if (finalText) {
      const parsed = parseVariants(finalText);
      onComplete({
        text: finalText,
        candidates: parsed.candidates,
        source: 'Web Speech API (Unconfirmed)'
      });
      return;
    }

    // 4. Truthful response when genuinely no speech was captured
    onComplete({
      text: '',
      candidates: [],
      source: 'No Speech Detected'
    });
  }
}

/**
 * Helper to transcribe sample clinical speech with one click
 */
export async function transcribeClinicalPreset(
  samplePhrase: string,
  languageCode: string
): Promise<{ text: string; candidates: CandidateVariant[]; source: string }> {
  try {
    const res = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_code: languageCode,
        mock_text: samplePhrase
      })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        text: data.text,
        candidates: data.parsed?.candidates || parseVariants(data.text).candidates,
        source: data.source
      };
    }
  } catch {
    // fallback
  }

  const parsed = parseVariants(samplePhrase);
  return {
    text: samplePhrase,
    candidates: parsed.candidates,
    source: 'Prisma Normalizer'
  };
}

let activeAudioElement: HTMLAudioElement | null = null;

/**
 * Text-to-Speech synthesis with Web Speech API and backend Timbre PCM WAV fallback
 */
export function speakClinicalText(text: string, langCode: string = 'en-IN', onEnd?: () => void) {
  stopSpeaking();
  if (!text || !text.trim()) {
    if (onEnd) onEnd();
    return;
  }

  // 1. Try Gnani Timbre TTS from backend first (uses live Gnani API key)
  playTimbreAudio(text, langCode, onEnd).then(success => {
    if (success) return;

    // 2. Fallback to Browser SpeechSynthesis if Timbre is unavailable
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        let hasFired = false;
        utterance.onend = () => {
          if (!hasFired && onEnd) {
            hasFired = true;
            onEnd();
          }
        };
        utterance.onerror = () => {
          if (!hasFired && onEnd) {
            hasFired = true;
            onEnd();
          }
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('SpeechSynthesis fallback skipped:', err);
      }
    }

    if (onEnd) onEnd();
  });
}

async function playTimbreAudio(text: string, langCode: string, onEnd?: () => void): Promise<boolean> {
  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language: langCode,
        voice: 'Kaveri'
      })
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      let audioUrl = '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.audio_base64) {
          const byteChars = atob(data.audio_base64);
          const byteNumbers = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const audioBlob = new Blob([byteNumbers], { type: 'audio/wav' });
          audioUrl = URL.createObjectURL(audioBlob);
        }
      } else {
        const blob = await res.blob();
        audioUrl = URL.createObjectURL(blob);
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        activeAudioElement = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          activeAudioElement = null;
          if (onEnd) onEnd();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          activeAudioElement = null;
          if (onEnd) onEnd();
        };

        await audio.play();
        return true;
      }
    }
  } catch (err) {
    console.warn('Timbre backend audio playback failed:', err);
  }
  return false;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
}
