import { ChangeDetectionStrategy, Component, DestroyRef, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getChatDateLabel, isSameDay } from '../../../core/utils/chat-date.utils';

import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Send, Info, Mic, Image, X, Trash } from 'lucide-angular';
import { GroupStore } from '../../../core/stores/group-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { WebsocketService } from '../../../core/services/websocket-service';
import { ToastService } from '../../../core/services/toast-service';
import { CloudinaryStorageService } from '../../../core/services/cloudinary-storage-service';
import { GroupService } from '../../../core/api/group-service';
import { GroupMessageDTO, GroupTypingEvent, InviaMessaggioGruppoRequestDTO } from '../../../models';
import { AudioPlayerComponent } from '../../../shared/components/audio-player/audio-player-component/audio-player-component';
import { AudioRecorderComponent } from '../../../shared/components/audio-recorder/audio-recorder-component/audio-recorder-component';
import { TimeAgoComponent } from '../../../shared/components/time-ago/time-ago-component/time-ago-component';
import { GroupInfoPanel } from '../group-info-panel/group-info-panel';

const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

@Component({
  selector: 'app-group-chat',
  imports: [
    FormsModule,
    LucideAngularModule,
    AudioPlayerComponent,
    AudioRecorderComponent,
    TimeAgoComponent,
    GroupInfoPanel
],
  templateUrl: './group-chat.html',
  styleUrl: './group-chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupChat implements OnInit, OnDestroy {
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  readonly groupStore = inject(GroupStore);
  readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly websocketService = inject(WebsocketService);
  private readonly groupService = inject(GroupService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly toast = inject(ToastService);
  private readonly cloudinary = inject(CloudinaryStorageService);

  readonly ArrowLeftIcon = ArrowLeft;
  readonly SendIcon = Send;
  readonly InfoIcon = Info;
  readonly MicIcon = Mic;
  readonly ImageIcon = Image;
  readonly XIcon = X;
  readonly TrashIcon = Trash;

  readonly messageText = signal('');
  readonly isSending = signal(false);
  readonly showInfoPanel = signal(false);
  readonly showRecorder = signal(false);
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly pendingImageUrl = signal<string | null>(null);
  readonly isUploadingImage = signal(false);
  readonly imageViewerUrl = signal<string | null>(null);
  readonly deletingIds = signal<Set<number>>(new Set());
  readonly typingUsers = signal<Map<number, string>>(new Map());

  private lastTypingSent = 0;
  private readonly TYPING_THROTTLE = 1000;
  private typingCleanupTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly imageInputRef = viewChild<ElementRef<HTMLInputElement>>('imageInputRef');

  readonly currentUserId = computed(() => this.authStore.userId());

  readonly canSend = computed(() =>
    (this.messageText().trim().length > 0 || !!this.pendingImageUrl()) && !this.isSending() && !this.isUploadingImage()
  );

  readonly typingText = computed(() => {
    const users = this.typingUsers();
    if (users.size === 0) return null;
    const names = [...users.values()];
    if (names.length === 1) return `${names[0]} sta scrivendo...`;
    if (names.length === 2) return `${names[0]} e ${names[1]} stanno scrivendo...`;
    return `${names[0]} e altri ${names.length - 1} stanno scrivendo...`;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const groupIdParam = params.get('groupId');
        if (!groupIdParam) return;
        this.groupStore.openGroup(Number.parseInt(groupIdParam, 10));
        this.scrollToBottom();
      });

    this.websocketService.groupTyping$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        const group = this.groupStore.currentGroup();
        if (!group || event.groupId !== group.id) return;
        if (event.senderId === this.currentUserId()) return;

        if (event.isTyping) {
          this.typingUsers.update(map => {
            const next = new Map(map);
            next.set(event.senderId, event.senderUsername);
            return next;
          });
          const existing = this.typingCleanupTimers.get(event.senderId);
          if (existing) clearTimeout(existing);
          this.typingCleanupTimers.set(event.senderId, setTimeout(() => {
            this.typingUsers.update(map => {
              const next = new Map(map);
              next.delete(event.senderId);
              return next;
            });
          }, 4000));
        } else {
          this.typingUsers.update(map => {
            const next = new Map(map);
            next.delete(event.senderId);
            return next;
          });
          const timer = this.typingCleanupTimers.get(event.senderId);
          if (timer) clearTimeout(timer);
          this.typingCleanupTimers.delete(event.senderId);
        }
      });
  }

  ngOnDestroy(): void {
    const group = this.groupStore.currentGroup();
    if (group) {
      this.groupService.clearTyping(group.id).subscribe();
    }
    this.typingCleanupTimers.forEach(timer => clearTimeout(timer));
    this.typingCleanupTimers.clear();
    if (this.scrollDebounceTimer !== null) {
      clearTimeout(this.scrollDebounceTimer);
    }
    this.groupStore.closeGroup();
  }

  getSenderColor(senderId: number): string {
    return AVATAR_COLORS[senderId % AVATAR_COLORS.length];
  }

  getSenderInitials(fullName: string): string {
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getGroupInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getGroupAvatarGradient(groupId: number): string {
    const gradients = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-cyan-500 to-cyan-600',
    ];
    return gradients[groupId % gradients.length];
  }

  shouldShowDateSeparator(messages: GroupMessageDTO[], index: number): boolean {
    if (index === 0) return true;
    return !isSameDay(messages[index - 1].createdAt, messages[index].createdAt);
  }

  getDateLabel(dateStr: string): string {
    return getChatDateLabel(dateStr);
  }

  onMessageInput(value: string): void {
    this.messageText.set(value);
    const group = this.groupStore.currentGroup();
    if (!group) return;
    const now = Date.now();
    if (now - this.lastTypingSent > this.TYPING_THROTTLE) {
      this.lastTypingSent = now;
      this.groupService.setTyping(group.id).subscribe();
    }
  }

  async deleteMessage(messageId: number): Promise<void> {
    if (this.deletingIds().has(messageId)) return;
    this.deletingIds.update(set => new Set(set).add(messageId));
    try {
      await this.groupStore.eliminaMessaggio(messageId);
    } catch {
      this.toast.error('Errore durante l\'eliminazione del messaggio');
    } finally {
      this.deletingIds.update(set => {
        const next = new Set(set);
        next.delete(messageId);
        return next;
      });
    }
  }

  isDeleting(messageId: number): boolean {
    return this.deletingIds().has(messageId);
  }

  async sendMessage(): Promise<void> {
    const text = this.messageText().trim();
    const imageUrl = this.pendingImageUrl();
    if ((!text && !imageUrl) || this.isSending()) return;

    this.isSending.set(true);
    this.messageText.set('');
    this.imagePreviewUrl.set(null);
    this.pendingImageUrl.set(null);

    // Clear typing quando invia
    const group = this.groupStore.currentGroup();
    if (group) this.groupService.clearTyping(group.id).subscribe();

    try {
      const request: InviaMessaggioGruppoRequestDTO = {
        contenuto: text || undefined,
        imageUrl: imageUrl || undefined,
      };
      await this.groupStore.inviaMessaggio(request);
      this.scrollToBottom();
    } catch {
      // Errore gestito dal store
    } finally {
      this.isSending.set(false);
    }
  }

  openImagePicker(): void {
    this.imageInputRef()?.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    this.imagePreviewUrl.set(localUrl);
    this.isUploadingImage.set(true);

    this.cloudinary.uploadImage(file, 'message').subscribe({
      next: (response) => {
        this.pendingImageUrl.set(response.secureUrl);
        this.isUploadingImage.set(false);
      },
      error: () => {
        this.imagePreviewUrl.set(null);
        this.pendingImageUrl.set(null);
        this.isUploadingImage.set(false);
        this.toast.error('Errore durante il caricamento dell\'immagine');
      },
    });
  }

  clearImagePreview(): void {
    this.imagePreviewUrl.set(null);
    this.pendingImageUrl.set(null);
    const input = this.imageInputRef()?.nativeElement;
    if (input) input.value = '';
  }

  openImageViewer(url: string): void {
    this.imageViewerUrl.set(url);
  }

  closeImageViewer(): void {
    this.imageViewerUrl.set(null);
  }

  async onAudioRecorded(event: { audioUrl: string; duration: number }): Promise<void> {
    this.showRecorder.set(false);
    this.isSending.set(true);

    try {
      const request: InviaMessaggioGruppoRequestDTO = {
        audioUrl: event.audioUrl,
        audioDuration: event.duration,
      };
      await this.groupStore.inviaMessaggio(request);
      this.scrollToBottom();
    } catch {
      // Errore gestito dal store
    } finally {
      this.isSending.set(false);
    }
  }

  async loadOlderMessages(): Promise<void> {
    if (!this.groupStore.hasMoreMessages() || this.groupStore.isLoading()) return;

    const container = this.messagesContainer()?.nativeElement;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    await this.groupStore.loadMoreMessages();

    // Mantieni la posizione di scroll dopo il caricamento
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    }
  }

  onScroll(): void {
    if (this.scrollDebounceTimer !== null) return;
    this.scrollDebounceTimer = setTimeout(() => {
      this.scrollDebounceTimer = null;
      const container = this.messagesContainer()?.nativeElement;
      if (container && container.scrollTop < 100) {
        this.loadOlderMessages();
      }
    }, 150);
  }

  goBack(): void {
    this.router.navigate(['/messages']);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }
}
