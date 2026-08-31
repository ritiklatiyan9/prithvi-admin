export type LudoGameMode = "TWO_PLAYER" | "FOUR_PLAYER" | string;

export interface GameUserSummary {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface GameRoomPlayer extends GameUserSummary {
  userId?: string;
  user?: GameUserSummary | null;
  colour?: string | null;
  color?: string | null;
  position?: number | null;
  seat?: number | null;
  status?: string | null;
  connectionStatus?: string | null;
  connected?: boolean;
  ready?: boolean;
  pawnsHome?: number;
  pawnsCompleted?: number;
  captures?: number;
}

export interface GameActionTimelineItem {
  id?: string;
  sequence?: number;
  stateVersion?: number;
  action?: string;
  type?: string;
  actorId?: string | null;
  userId?: string | null;
  actor?: GameUserSummary | null;
  diceValue?: number | null;
  pawnIndex?: number | null;
  detail?: string | null;
  payload?: unknown;
  createdAt?: string | null;
  timestamp?: string | null;
}

export interface GameOverview {
  onlinePlayers: number;
  matchmakingPlayers: number;
  activeRooms: number;
  completedMatches: number;
  abandonedMatches: number;
  averageMatchDurationSeconds: number;
  reconnectionRate: number;
  forfeitRate: number;
  websocketHealth?: string | null;
  websocketConnections?: number;
  websocketErrors?: number;
  generatedAt?: string | null;
}

export interface GameRoomSummary {
  id: string;
  roomId?: string;
  mode: LudoGameMode;
  status: string;
  players: GameRoomPlayer[];
  currentTurnUserId?: string | null;
  currentTurn?: GameUserSummary | null;
  durationSeconds?: number;
  connectedPlayers?: number;
  stateVersion?: number;
  createdAt?: string | null;
  startedAt?: string | null;
  updatedAt?: string | null;
}

export interface GameRoomDetails extends GameRoomSummary {
  actions?: GameActionTimelineItem[];
  lastActionAt?: string | null;
  reconnectingPlayers?: number;
  metadata?: unknown;
}

export interface GameMatchSummary {
  id: string;
  roomId: string;
  mode: LudoGameMode;
  status: string;
  players: GameRoomPlayer[];
  winnerId?: string | null;
  winner?: GameUserSummary | null;
  result?: string | null;
  durationSeconds?: number;
  disconnects?: number;
  forfeits?: number;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface GameMatchDetails extends GameMatchSummary {
  actions?: GameActionTimelineItem[];
  connectionSummary?: unknown;
  metadata?: unknown;
}

export interface GamePlayerStatistics {
  totalMatches?: number;
  wins?: number;
  losses?: number;
  winPercentage?: number;
  twoPlayerMatches?: number;
  threePlayerMatches?: number;
  fourPlayerMatches?: number;
  disconnects?: number;
  forfeits?: number;
}

export interface GamePlayerRestrictions {
  gameSuspendedUntil?: string | null;
  chatMutedUntil?: string | null;
  reason?: string | null;
}

export interface GamePlayerSummary extends GameUserSummary {
  userId?: string;
  user?: GameUserSummary | null;
  online?: boolean;
  isOnline?: boolean;
  subscriptionPlan?: string | null;
  plan?: string | null;
  entitlement?: { plan?: string | null; status?: string | null } | null;
  statistics?: GamePlayerStatistics;
  stats?: GamePlayerStatistics;
  restrictions?: GamePlayerRestrictions;
  gameSuspendedUntil?: string | null;
  chatMutedUntil?: string | null;
  reportCount?: number;
  activeRoomId?: string | null;
  lastSeenAt?: string | null;
}

export interface GamePlayerDetails extends GamePlayerSummary {
  reports?: GameReport[];
  recentMatches?: GameMatchSummary[];
  adminNotes?: Array<{
    id?: string;
    note: string;
    adminEmail?: string | null;
    createdAt?: string | null;
  }>;
  metadata?: unknown;
}

export interface GameReport {
  id: string;
  status: string;
  type?: string | null;
  category?: string | null;
  reason?: string | null;
  message?: string | null;
  details?: string | null;
  roomId?: string | null;
  reporter?: GameUserSummary | null;
  reportedUser?: GameUserSummary | null;
  targetUser?: GameUserSummary | null;
  resolution?: string | null;
  resolutionNote?: string | null;
  resolvedBy?: GameUserSummary | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
  metadata?: unknown;
}

export interface SubscriptionAnalytics {
  freeUsers: number;
  plan349Users: number;
  plan499Users: number;
  plusUsers?: number;
  proUsers?: number;
  newSubscriptions: number;
  renewals: number;
  failedPayments: number;
  cancellations: number;
  expiringSubscriptions: number;
  razorpayWebhookHealth?: string | null;
  webhookLastReceivedAt?: string | null;
  generatedAt?: string | null;
}

export interface GamePaymentEvent {
  id: string;
  eventId?: string | null;
  razorpayEventId?: string | null;
  type: string;
  status: string;
  user?: GameUserSummary | null;
  plan?: string | null;
  amountPaise?: number | null;
  currency?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySubscriptionId?: string | null;
  error?: string | null;
  summary?: unknown;
  createdAt?: string | null;
  processedAt?: string | null;
}

export interface GameConfigValues extends Record<string, unknown> {
  turnDurationSeconds?: number;
  reconnectionGracePeriodSeconds?: number;
  enabledModes?: LudoGameMode[];
  threeSixRuleEnabled?: boolean;
  quickMessages?: string[];
  freeReactionCount?: number;
  maintenanceMode?: boolean;
  minimumSupportedAppVersion?: string;
  chatRateLimitPerMinute?: number;
}

export interface GameConfiguration {
  values: GameConfigValues;
  updatedAt?: string | null;
  updatedBy?: GameUserSummary | null;
}

export interface MonitoringIncident {
  id?: string;
  type: string;
  count?: number;
  detail?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface GameMonitoring {
  socketConnections: number;
  socketErrors: number;
  matchmakingFailures: number;
  roomCreationFailures: number;
  desynchronisationIncidents: number;
  paymentWebhookErrors: number;
  voiceSignallingErrors: number;
  websocketHealth?: string | null;
  incidents?: MonitoringIncident[];
  generatedAt?: string | null;
}

export interface GameAuditEntry {
  id: string;
  adminId?: string | null;
  adminEmail?: string | null;
  admin?: GameUserSummary | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: string | null;
}

export interface PlayerRestrictionInput {
  gameSuspendedUntil?: string | null;
  chatMutedUntil?: string | null;
  reason: string;
}

export interface PlayerRestrictionUpdateResult {
  userId: string;
  gameSuspendedUntil: string | null;
  chatMutedUntil: string | null;
  restrictions?: Array<{
    id: string;
    type: string;
    reason: string;
    expiresAt?: string | null;
    revokedAt?: string | null;
    createdAt?: string | null;
  }>;
}
