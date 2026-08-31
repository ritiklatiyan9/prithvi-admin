import { apiClient } from "./api-client";
import type { ApiSuccess, Paginated } from "@/types/api";

export type RedemptionStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED" | "FAILED";
export type RedemptionMethod = "VOUCHER" | "UPI";

// Mirrors RedemptionDto in the backend's redemptions.schema.ts (admin listing shape).
export interface Redemption {
  id: string;
  coins: number;
  status: RedemptionStatus;
  method: RedemptionMethod;
  upiId: string | null;
  /** Rupee value snapshotted at request time (UPI rows). */
  amountInr: number | null;
  provider: string | null;
  voucherCode: string | null;
  voucherUrl: string | null;
  note: string | null;
  reviewedAt: string | null;
  createdAt: string;
  offer: {
    id: string;
    title: string;
    brand: string;
    imageUrl: string | null;
    denomination: number;
  } | null;
  providerRef?: string | null;
  failReason?: string | null;
  user?: { id: string; name: string; email: string };
}

// Mirrors VoucherOfferDto in the backend's redemptions.schema.ts.
export interface VoucherOffer {
  id: string;
  title: string;
  brand: string;
  description: string | null;
  imageUrl: string | null;
  coinCost: number;
  denomination: number;
  provider: string;
  providerBrandId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export type VoucherProviderKind = "manual" | "plum" | "xoxo_code";

export interface VoucherOfferInput {
  title: string;
  brand: string;
  description?: string | null;
  imageUrl?: string | null;
  coinCost: number;
  denomination: number;
  provider: VoucherProviderKind;
  providerBrandId?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ProviderStatus {
  configured: boolean;
  enabled: boolean;
  hasRefreshCredentials: boolean;
  baseUrl: string;
  activeProviders: string[];
}

export const redemptionsService = {
  list: async (
    params: {
      page: number;
      limit: number;
      status?: RedemptionStatus;
      method?: RedemptionMethod;
      search?: string;
      from?: string;
      to?: string;
    },
    signal?: AbortSignal,
  ): Promise<Paginated<Redemption>> => {
    const { data } = await apiClient.get<ApiSuccess<Redemption[]>>(
      "/redemptions",
      {
        params,
        signal,
      },
    );
    return { items: data.data, meta: data.meta! };
  },

  review: async (
    id: string,
    input: { action: "APPROVE" | "REJECT"; note?: string },
  ): Promise<Redemption> => {
    const { data } = await apiClient.patch<ApiSuccess<Redemption>>(
      `/redemptions/${id}/review`,
      input,
    );
    return data.data;
  },

  /** Claim a UPI payout before paying: blocks reject/refund until paid or released. */
  claim: async (id: string): Promise<Redemption> => {
    const { data } = await apiClient.patch<ApiSuccess<Redemption>>(
      `/redemptions/${id}/claim`,
      {},
    );
    return data.data;
  },

  /** Put a claimed-but-unpaid UPI payout back in the pending queue. */
  release: async (id: string): Promise<Redemption> => {
    const { data } = await apiClient.patch<ApiSuccess<Redemption>>(
      `/redemptions/${id}/release`,
      {},
    );
    return data.data;
  },

  /** Settle a UPI payout AFTER the money has been sent. paymentRef = the UPI UTR. */
  markPaid: async (
    id: string,
    input: { paymentRef?: string; note?: string },
  ): Promise<Redemption> => {
    const { data } = await apiClient.patch<ApiSuccess<Redemption>>(
      `/redemptions/${id}/mark-paid`,
      input,
    );
    return data.data;
  },

  fulfill: async (
    id: string,
    input: { voucherCode: string; voucherUrl?: string },
  ): Promise<Redemption> => {
    const { data } = await apiClient.patch<ApiSuccess<Redemption>>(
      `/redemptions/${id}/fulfill`,
      input,
    );
    return data.data;
  },

  listCatalog: async (): Promise<VoucherOffer[]> => {
    const { data } = await apiClient.get<ApiSuccess<VoucherOffer[]>>(
      "/redemptions/admin/catalog",
    );
    return data.data;
  },

  createOffer: async (input: VoucherOfferInput): Promise<VoucherOffer> => {
    const { data } = await apiClient.post<ApiSuccess<VoucherOffer>>(
      "/redemptions/admin/catalog",
      input,
    );
    return data.data;
  },

  updateOffer: async (
    id: string,
    input: Partial<VoucherOfferInput>,
  ): Promise<VoucherOffer> => {
    const { data } = await apiClient.patch<ApiSuccess<VoucherOffer>>(
      `/redemptions/admin/catalog/${id}`,
      input,
    );
    return data.data;
  },

  deleteOffer: async (id: string): Promise<void> => {
    await apiClient.delete(`/redemptions/admin/catalog/${id}`);
  },

  providerStatus: async (): Promise<ProviderStatus> => {
    const { data } = await apiClient.get<ApiSuccess<ProviderStatus>>(
      "/redemptions/admin/provider/status",
    );
    return data.data;
  },

  testProvider: async (): Promise<{ ok: boolean; message: string }> => {
    const { data } = await apiClient.post<
      ApiSuccess<{ ok: boolean; message: string }>
    >("/redemptions/admin/provider/test");
    return data.data;
  },
};
