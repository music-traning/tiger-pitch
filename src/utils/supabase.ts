import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TigerId } from "@/hooks/useGameLogic";

export type RankingStatus = "deal_closed" | "bankrupt";

export interface RankingRecord {
  id: string;
  player_name: string;
  idea_summary: string;
  final_valuation: number;
  nemesis_id: TigerId | string;
  status: RankingStatus;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase クライアントインスタンス
 * 環境変数が未設定のビルド時にもクラッシュしないよう安全に初期化します。
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Route Handler 等で確実に設定済みのクライアントを取得するヘルパー
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase環境変数 (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) が設定されていません。"
    );
  }

  return createClient(url, key);
}
