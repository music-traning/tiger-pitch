import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import {
  Award,
  Skull,
  Share2,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  Sparkles,
  Gamepad2,
  Flame,
  Wrench,
  Feather,
  type LucideIcon,
} from "lucide-react";
import { getSupabaseClient, type RankingRecord } from "@/utils/supabase";
import type { TigerId } from "@/hooks/useGameLogic";

interface ResultPageProps {
  params: Promise<{ id: string }>;
}

const TIGER_INFO: Record<TigerId, { name: string; icon: LucideIcon }> = {
  niche: { name: "ニッチな熱血社長", icon: Gamepad2 },
  party: { name: "パーティーロッカー", icon: Flame },
  innovator: { name: "完璧主義のイノベーター", icon: Sparkles },
  boss: { name: "関西の親方", icon: Wrench },
  strategist: { name: "天才軍師", icon: Feather },
};

async function getBaseUrl(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") ?? "https";
    if (host) {
      const protocol = host.includes("localhost") ? "http" : proto;
      return `${protocol}://${host}`;
    }
  } catch {
    // fallback below
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://tiger-pitch.vercel.app";
}

async function fetchRankingById(id: string): Promise<RankingRecord | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("rankings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }
    return data as RankingRecord;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: ResultPageProps): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = await getBaseUrl();
  const record = await fetchRankingById(id);

  const score = record?.final_valuation ?? 0;
  const status = record?.status ?? "deal_closed";
  const formattedScore = `¥${score.toLocaleString("ja-JP")}`;

  const ogImageUrl = `${baseUrl}/api/og?score=${encodeURIComponent(
    String(score)
  )}&status=${encodeURIComponent(status)}`;

  const title = record
    ? `${record.player_name}の査定結果: ${formattedScore} | TIGER PITCH`
    : "AI投資家査定結果 | TIGER PITCH";
  const description = record
    ? `事業アイデア「${record.idea_summary}」への最終出資額は ${formattedScore} でした！`
    : "5人の冷酷なAI投資家（虎）と交渉し、1億円の出資を目指すピッチバトルゲーム";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/result/${id}`,
      siteName: "TIGER PITCH - Universal Make Associates",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ResultDetailPage({ params }: ResultPageProps) {
  const { id } = await params;
  const baseUrl = await getBaseUrl();
  const record = await fetchRankingById(id);

  if (!record) {
    return (
      <div className="bg-black min-h-screen text-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-950 border border-gray-800 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-gray-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-white">
              査定結果が見つかりませんでした
            </h1>
            <p className="text-xs text-gray-400">
              指定されたID（{id}）のレコードが存在しないか、削除された可能性があります。
            </p>
          </div>
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>トップへ戻る（再挑戦）</span>
          </Link>
        </div>
      </div>
    );
  }

  const isBankrupt = record.status === "bankrupt";
  const formattedScore = `¥${record.final_valuation.toLocaleString("ja-JP")}`;
  const nemesisKey = record.nemesis_id as TigerId;
  const nemesisInfo = TIGER_INFO[nemesisKey] ?? {
    name: "審査員",
    icon: ShieldAlert,
  };
  const NemesisIcon = nemesisInfo.icon;

  // X (Twitter) シェア用URLの組み立て
  const resultPageUrl = `${baseUrl}/result/${record.id}`;
  const tweetText = `私のアイデアへの出資額は【${formattedScore}】でした！5人の冷酷なAI投資家によるガチ査定を生き残れ！ #アイデア査定ダッシュボード #UniversalMakeAssociates`;
  const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}&url=${encodeURIComponent(resultPageUrl)}`;

  const ogPreviewUrl = `/api/og?score=${encodeURIComponent(
    String(record.final_valuation)
  )}&status=${encodeURIComponent(record.status)}`;

  return (
    <div className="bg-black min-h-screen text-gray-100">
      <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between bg-gray-950 border-x border-gray-800/80 shadow-2xl relative overflow-hidden p-5 space-y-6">
        {/* サイバー幾何学模様の背景装飾 */}
        <div
          className={`pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full border ${
            isBankrupt ? "border-red-500/20" : "border-green-500/20"
          }`}
        />
        <div
          className={`pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full border border-dashed ${
            isBankrupt ? "border-red-500/30" : "border-green-500/30"
          }`}
        />

        {/* 上部ヘッダー */}
        <header className="relative z-10 flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-sm ${
                isBankrupt ? "bg-red-500" : "bg-green-500"
              }`}
            />
            <span className="font-mono text-xs font-bold tracking-widest text-gray-300">
              TIGER PITCH // RESULT REPORT
            </span>
          </div>
          <span
            className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              isBankrupt
                ? "bg-red-950/70 text-red-400 border-red-700/80"
                : "bg-green-950/70 text-green-400 border-green-700/80"
            }`}
          >
            {isBankrupt ? "BANKRUPT" : "DEAL CLOSED"}
          </span>
        </header>

        {/* メイン結果カード */}
        <main className="relative z-10 flex-1 flex flex-col justify-center space-y-5">
          {/* ヒーロー査定額カード（OGPと同テイスト） */}
          <div
            className={`rounded-2xl p-6 text-center space-y-4 border bg-gradient-to-b from-gray-900 to-gray-950 ${
              isBankrupt
                ? "border-red-800/80 shadow-[0_0_35px_rgba(239,68,68,0.2)]"
                : "border-green-700/80 shadow-[0_0_35px_rgba(34,197,94,0.2)]"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
                isBankrupt
                  ? "bg-red-950/80 border-red-600 text-red-400"
                  : "bg-green-950/80 border-green-500 text-green-400"
              }`}
            >
              {isBankrupt ? (
                <Skull className="w-7 h-7" />
              ) : (
                <Award className="w-7 h-7" />
              )}
            </div>

            {isBankrupt ? (
              <div className="space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-widest text-red-400">
                  MENTAL HP DEPLETED (0%)
                </p>
                <h1 className="text-2xl font-black text-red-500 tracking-tight">
                  メンタルブレイク（破産）
                </h1>
                <p className="font-mono text-sm text-gray-400 pt-1">
                  最終資金調達額: {formattedScore}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-[11px] font-mono uppercase tracking-widest text-gray-400">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span>最終資金調達額</span>
                </div>
                <h1 className="font-mono text-4xl font-black text-green-400 tracking-tight drop-shadow-[0_0_12px_rgba(74,222,128,0.3)]">
                  {formattedScore}
                </h1>
              </div>
            )}
          </div>

          {/* 動的生成OGPイメージのプレビュー */}
          <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogPreviewUrl}
              alt="Generated OGP Card"
              className="w-full h-auto block"
            />
          </div>

          {/* 詳細情報（起業家名・事業アイデア・宿敵） */}
          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <span className="font-mono text-gray-400 uppercase">
                FOUNDER / PLAYER
              </span>
              <span className="font-bold text-white text-sm">
                {record.player_name}
              </span>
            </div>

            <div className="space-y-1 border-b border-gray-800 pb-3">
              <span className="font-mono text-gray-400 uppercase block">
                PITCHED IDEA SUMMARY
              </span>
              <p className="text-gray-200 leading-relaxed bg-gray-950/70 p-2.5 rounded-lg border border-gray-800/80">
                {record.idea_summary}
              </p>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="font-mono text-gray-400 uppercase">
                NEMESIS (最大の障壁となった虎)
              </span>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-800/70 text-red-300">
                <NemesisIcon className="w-4 h-4 text-red-400" />
                <span className="font-bold">{nemesisInfo.name}</span>
              </div>
            </div>
          </div>
        </main>

        {/* 下部アクションボタン群（Xシェア & トップへ戻る） */}
        <footer className="relative z-10 space-y-2.5 pt-2 border-t border-gray-800">
          <a
            href={twitterIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold text-sm transition shadow-[0_0_20px_rgba(14,165,233,0.35)] cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>X（旧Twitter）で査定結果をシェアする</span>
          </a>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 font-semibold text-xs border border-gray-800 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>トップへ戻る（新しいアイデアで再挑戦）</span>
          </Link>

          <div className="text-center pt-1 flex items-center justify-center gap-3">
            <span className="font-mono text-[10px] tracking-widest text-gray-500">
              Powered by Universal Make Associates
            </span>
            <a
              href="https://note.com/jazzy_begin"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-gray-400 hover:text-gray-200 transition"
            >
              ©2026 buro
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
