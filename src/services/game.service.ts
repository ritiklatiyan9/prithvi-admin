import { apiClient } from "./api-client";
import type { ApiSuccess } from "@/types/api";

export type TttDifficulty = "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";

export const TTT_DIFFICULTIES: TttDifficulty[] = [
  "EASY",
  "MEDIUM",
  "HARD",
  "IMPOSSIBLE",
];

/** Settings-registry keys for the tic-tac-toe game (edited via the settings PATCH flow). */
export const TTT_SETTING_KEYS = {
  enabled: "game.ttt.enabled",
  winCoins: "game.ttt.winCoins",
  hintWinCoins: "game.ttt.hintWinCoins",
  difficulty: "game.ttt.difficulty",
  freeDailyLimit: "game.ttt.freeDailyLimit",
  plusDailyLimit: "game.ttt.plusDailyLimit",
  proDailyLimit: "game.ttt.proDailyLimit",
} as const;

export interface TttConfig {
  enabled: boolean;
  winCoins: number;
  hintWinCoins: number;
  difficulty: TttDifficulty;
  membershipPlan: "FREE" | "PLUS" | "PRO";
  textChatEnabled: boolean;
  voiceChatEnabled: boolean;
  dailyLimit: number;
  playedToday: number;
  remaining: number;
}

export const gameService = {
  /** Live config as the app resolves it — handy to verify saved settings took effect. */
  tttConfig: async (): Promise<TttConfig> => {
    const { data } =
      await apiClient.get<ApiSuccess<TttConfig>>("/game/ttt/config");
    return data.data;
  },
};
