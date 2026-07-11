import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";
import type { Wallet, WalletTransaction } from "@/types/domain";

export const walletService = {
  myWallet: async (): Promise<Wallet> => {
    const { data } = await apiClient.get<ApiSuccess<Wallet>>("/wallet");
    return data.data;
  },

  transactions: async (params: {
    page: number;
    limit: number;
  }): Promise<Paginated<WalletTransaction>> => {
    const { data } = await apiClient.get<ApiSuccess<WalletTransaction[]>>("/wallet/transactions", {
      params,
    });
    return { items: data.data, meta: data.meta! };
  },
};
