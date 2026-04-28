import {
  Component,
  output,
  signal,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';

import { LucideAngularModule, Mic, Square, Trash2, Send } from 'lucide-angular';
import { CloudinaryStorageService } from '../../../../core/services/cloudinary-storage-service';
import { ToastService } from '../../../../core/services/toast-service';
import { LIMITS } from '../../../../core/config/app.config';

type RecorderState = 'idle' | 'recording' | 'recorded' | 'uploading';

@Component({
  selector: 'app-audio-recorder-component',
  imports: [LucideAngularModule],
  templateUrl: './audio-recorder-component.html',
  styleUrl: './audio-recorder-component.scss',
})
export class AudioRecorderComponent implements OnDestroy {
  private readonly cloudinary = inject(CloudinaryStorageService);
  private readonly toastService = inject(ToastService);

  readonly MicIcon = Mic;
  readonly SquareIcon = Square;
  readonly Trash2Icon = Trash2;
  readonly SendIcon = Send;

  /**
   * Emesso al termine dell'upload con url e durata
   */
  readonly recorded = output<{ audioUrl: string; duration: number }>();

  /**
   * Emesso quando si annulla la registrazione
   */
  readonly cancelled = output<void>();

  readonly state = signal<RecorderState>('idle');
  readonly elapsedSeconds = signal(0);
  readonly uploadProgress = signal(0);

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private blob: Blob | null = null;
  private durationSeconds = 0;
  private timerInterval?: ReturnType<typeof setInterval>;

  readonly isRecording = computed(() => this.state() === 'recording');
  readonly isRecorded = computed(() => this.state() === 'recorded');
  readonly isUploading = computed(() => this.state() === 'uploading');

  /** Secondi rimasti prima del limite */
  readonly secondsLeft = computed(() => LIMITS.AUDIO_MAX_DURATION - this.elapsedSeconds());

  /** Larghezza barra progresso timer (%) */
  readonly timerPercent = computed(() =>
    Math.min((this.elapsedSeconds() / LIMITS.AUDIO_MAX_DURATION) * 100, 100)
  );

  readonly timerLabel = computed(() => {
    const s = this.elapsedSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  /** Colore barra: verde → arancione → rosso negli ultimi 10s */
  readonly timerBarClass = computed(() => {
    const left = this.secondsLeft();
    if (left <= 10) return 'bg-red-500';
    if (left <= 30) return 'bg-amber-500';
    return 'bg-primary-500';
  });

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];

      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', '']
        .find(t => !t || MediaRecorder.isTypeSupported(t)) ?? '';
      this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const actualType = this.mediaRecorder?.mimeType || 'audio/webm';
        this.blob = new Blob(this.chunks, { type: actualType });
        this.durationSeconds = this.elapsedSeconds();
        stream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start(100);
      this.state.set('recording');
      this.elapsedSeconds.set(0);

      this.timerInterval = setInterval(() => {
        if (this.state() !== 'recording') return;

        const next = this.elapsedSeconds() + 1;
        this.elapsedSeconds.set(next);

        if (next >= LIMITS.AUDIO_MAX_DURATION) {
          this.stopRecording();
          this.toastService.error('Durata massima di 2 minuti raggiunta');
        }
      }, 1000);
    } catch {
      this.toastService.error('Impossibile accedere al microfono');
    }
  }

  stopRecording(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.state.set('recorded');
  }

  discard(): void {
    this.blob = null;
    this.durationSeconds = 0;
    this.elapsedSeconds.set(0);
    this.state.set('idle');
    this.cancelled.emit();
  }

  async send(): Promise<void> {
    if (!this.blob) return;
    this.state.set('uploading');
    this.uploadProgress.set(0);

    this.cloudinary.uploadAudio(this.blob, (p) => this.uploadProgress.set(p)).subscribe({
      next: (url) => {
        this.recorded.emit({ audioUrl: url, duration: this.durationSeconds });
        this.blob = null;
        this.durationSeconds = 0;
        this.elapsedSeconds.set(0);
        this.state.set('idle');
      },
      error: () => {
        this.toastService.error('Errore nel caricamento del messaggio vocale');
        this.state.set('recorded');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.mediaRecorder?.state === 'recording') this.mediaRecorder.stop();
  }
}
