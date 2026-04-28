import {
  Component,
  input,
  signal,
  computed,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play, Pause, Mic } from 'lucide-angular';

@Component({
  selector: 'app-audio-player-component',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './audio-player-component.html',
  styleUrl: './audio-player-component.scss',
})
export class AudioPlayerComponent implements OnDestroy {
  readonly PlayIcon = Play;
  readonly PauseIcon = Pause;
  readonly MicIcon = Mic;

  /**
   * URL del file audio su Cloudinary
   */
  readonly audioUrl = input.required<string>();

  /**
   * Durata totale nota (in secondi) — mostrata prima del play
   */
  readonly duration = input.required<number>();

  /**
   * Stile della bolla: messaggi inviati (destra) vs ricevuti (sinistra)
   * @default false
   */
  readonly isMine = input<boolean>(false);

  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly isLoading = signal(false);

  private audio: HTMLAudioElement | null = null;

  constructor() {
    // Quando cambia l'URL distruggi e ricrea l'elemento audio
    effect(() => {
      const url = this.audioUrl();
      this.destroy();
      if (url) {
        this.audio = new Audio(url);
        this.audio.preload = 'metadata';
        this.audio.ontimeupdate = () => this.currentTime.set(this.audio!.currentTime);
        this.audio.onended = () => { this.isPlaying.set(false); this.currentTime.set(0); };
        this.audio.onwaiting = () => this.isLoading.set(true);
        this.audio.oncanplay = () => this.isLoading.set(false);
      }
    });
  }

  readonly effectiveDuration = computed(() =>
    this.audio?.duration && isFinite(this.audio.duration)
      ? this.audio.duration
      : this.duration()
  );

  /** Percentuale completamento (0–100) */
  readonly progressPercent = computed(() => {
    const dur = this.effectiveDuration();
    if (!dur) return 0;
    return Math.min((this.currentTime() / dur) * 100, 100);
  });

  readonly timeLabel = computed(() => {
    const remaining = Math.max(0, this.effectiveDuration() - this.currentTime());
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  /** Colori barra: diversi per mine vs received */
  readonly progressBarClass = computed(() =>
    this.isMine()
      ? 'bg-white/70'
      : 'bg-primary-500 dark:bg-primary-400'
  );

  readonly trackClass = computed(() =>
    this.isMine()
      ? 'bg-white/30'
      : 'bg-gray-200 dark:bg-gray-600'
  );

  readonly iconClass = computed(() =>
    this.isMine()
      ? 'text-white'
      : 'text-primary-600 dark:text-primary-400'
  );

  readonly iconBgClass = computed(() =>
    this.isMine()
      ? 'bg-white/20 hover:bg-white/30'
      : 'bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/40 dark:hover:bg-primary-900/60'
  );

  readonly textClass = computed(() =>
    this.isMine()
      ? 'text-white/80'
      : 'text-gray-500 dark:text-gray-400'
  );

  togglePlay(): void {
    if (!this.audio) return;

    if (this.isPlaying()) {
      this.audio.pause();
      this.isPlaying.set(false);
    } else {
      this.audio.play().then(() => this.isPlaying.set(true)).catch(() => this.isPlaying.set(false));
    }
  }

  onSeek(event: Event): void {
    const input = event.target as HTMLInputElement;
    const time = (parseFloat(input.value) / 100) * this.effectiveDuration();
    if (this.audio) this.audio.currentTime = time;
    this.currentTime.set(time);
  }

  private destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.isLoading.set(false);
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
