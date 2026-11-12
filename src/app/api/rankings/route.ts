import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseClient,
  type RankingRecord,
  type RankingStatus,
} from "@/utils/supabase";
import type { TigerId } from "@/hooks/useGameLogic";

export interface CreateRankingBody {
  player_name: string;
  idea_summary: string;
  final_valuation: number;
  nemesis_id: TigerId | string;
  status: RankingStatus;
}

/**
 * GET /api/rankings
 * final_valuation の降順（高い順）で上位20件のランキングデータを取得
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("rankings")
      .select("*")
      .order("final_valuation", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rankings: (data ?? []) as RankingRecord[],
    });
  } catch (error) {
    console.error("[GET /api/rankings] Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "ランキングの取得中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/rankings
 * ゲーム終了時のスコア・プレイヤー情報を rankings テーブルに Insert
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CreateRankingBody>;

    const playerName =
      typeof body.player_name === "string" ? body.player_name.trim() : "";
    const ideaSummary =
      typeof body.idea_summary === "string" && body.idea_summary.trim() !== ""
        ? body.idea_summary.trim()
        : "（アイデア記録なし）";
    const finalValuation =
      typeof body.final_valuation === "number" &&
      !Number.isNaN(body.final_valuation)
        ? Math.max(0, Math.round(body.final_valuation))
        : 0;
    const nemesisId =
      typeof body.nemesis_id === "string" && body.nemesis_id.trim() !== ""
        ? body.nemesis_id.trim()
        : "strategist";
    const status: RankingStatus =
      body.status === "deal_closed" || body.status === "bankrupt"
        ? body.status
        : "bankrupt";

    if (!playerName) {
      return NextResponse.json(
        { error: "プレイヤー名（起業家名）を入力してください。" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("rankings")
      .insert([
        {
          player_name: playerName,
          idea_summary: ideaSummary,
          final_valuation: finalValuation,
          nemesis_id: nemesisId,
          status,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ranking: data as RankingRecord },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/rankings] Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "ランキングの登録中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
