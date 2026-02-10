import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Users,
  FileText,
  MessageSquare,
  Heart,
  Activity,
  Shield,
  TrendingUp,
  RefreshCw,
  CircleAlert,
  Database,
  Gauge,
  ScrollText,
} from 'lucide-angular';
import { Subject, takeUntil, finalize } from 'rxjs';

import { AdminService, SystemStatsResponse } from '../../../../core/api/admin-service';
import { ToastService } from '../../../../core/services/toast-service';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';

// Interfaccia per le statistiche
interface StatCard {
  label: string;
  value: number;
  icon: typeof Users;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo';
  description?: string;
}

@Component({
  selector: 'app-dashboard-component',
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
  ],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly UsersIcon = Users;
  readonly FileTextIcon = FileText;
  readonly MessageSquareIcon = MessageSquare;
  readonly HeartIcon = Heart;
  readonly ActivityIcon = Activity;
  readonly ShieldIcon = Shield;
  readonly TrendingUpIcon = TrendingUp;
  readonly RefreshIcon = RefreshCw;
  readonly AlertCircleIcon = CircleAlert;

  // State
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly stats = signal<SystemStatsResponse | null>(null);
  readonly lastUpdate = signal<Date | null>(null);

  // Computed: statistiche formattate per le card
  readonly statCards = computed<StatCard[]>(() => {
    const data = this.stats();
    if (!data) return [];

    return [
      {
        label: 'Utenti totali',
        value: data['totalUsers'] ?? data['utentiTotali'] ?? 0,
        icon: Users,
        color: 'blue' as const,
        description: 'Utenti registrati',
      },
      {
        label: 'Utenti attivi',
        value: data['activeUsers'] ?? data['utentiAttivi'] ?? 0,
        icon: Activity,
        color: 'green' as const,
        description: 'Account attivi',
      },
      {
        label: 'Post totali',
        value: data['totalPosts'] ?? data['postTotali'] ?? 0,
        icon: FileText,
        color: 'purple' as const,
        description: 'Post pubblicati',
      },
      {
        label: 'Commenti totali',
        value: data['totalComments'] ?? data['commentiTotali'] ?? 0,
        icon: MessageSquare,
        color: 'indigo' as const,
        description: 'Commenti scritti',
      },
      {
        label: 'Like totali',
        value: data['totalLikes'] ?? data['likeTotali'] ?? 0,
        icon: Heart,
        color: 'red' as const,
        description: 'Like assegnati',
      },
      {
        label: 'Amministratori',
        value: data['totalAdmins'] ?? data['amministratori'] ?? 0,
        icon: Shield,
        color: 'yellow' as const,
        description: 'Utenti admin',
      },
    ];
  });

  // Sezioni navigazione rapida
  readonly quickActions = [
    { label: 'Gestione utenti', route: '/admin/users', icon: Users, description: 'Gestisci utenti, ruoli e permessi' },
    { label: 'Moderazione', route: '/admin/moderation', icon: Shield, description: 'Modera post e commenti' },
    { label: 'Audit Log', route: '/admin/audit-log', icon: ScrollText, description: 'Visualizza log delle azioni admin' },
    { label: 'Rate Limit', route: '/admin/rate-limit', icon: Gauge, description: 'Gestisci limiti di utilizzo' },
    { label: 'Manutenzione', route: '/admin/system', icon: Database, description: 'Pulizia e manutenzione sistema' },
  ];

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica le statistiche dal server
   */
  loadStats(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.adminService.getSystemStats()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data) => {
          this.stats.set(data);
          this.lastUpdate.set(new Date());
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento delle statistiche');
        }
      });
  }

  /**
   * Ricarica le statistiche
   */
  refresh(): void {
    this.loadStats();
  }

  /**
   * Formatta numero con separatori migliaia
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('it-IT').format(value);
  }

  /**
   * Ottiene classe colore per la card
   */
  getCardColorClasses(color: StatCard['color']): string {
    const colors: Record<StatCard['color'], string> = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    };
    return colors[color];
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/']);
  }
}
