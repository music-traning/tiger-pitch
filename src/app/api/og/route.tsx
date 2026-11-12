import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const rawScore = Number(searchParams.get("score") ?? "0");
  const score = Number.isNaN(rawScore) ? 0 : Math.max(0, Math.round(rawScore));
  const status = searchParams.get("status") === "bankrupt" ? "bankrupt" : "deal_closed";

  const isBankrupt = status === "bankrupt";
  const formattedScore = `¥${score.toLocaleString("ja-JP")}`;

  return new ImageResponse(
    (
      <div
        tw="flex flex-col justify-between w-full h-full p-14 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, #1f2937 0%, #090d16 55%, #030712 100%)",
          color: "#f9fafb",
          fontFamily: "sans-serif",
        }}
      >
        {/* サイバー幾何学模様（右上・左下のグリッド＆コーナーフレーム装飾） */}
        <div
          tw="absolute -top-24 -right-24 w-96 h-96 rounded-full"
          style={{
            border: isBankrupt
              ? "2px solid rgba(239, 68, 68, 0.25)"
              : "2px solid rgba(34, 197, 94, 0.25)",
          }}
        />
        <div
          tw="absolute -top-12 -right-12 w-72 h-72 rounded-full"
          style={{
            border: isBankrupt
              ? "1px dashed rgba(239, 68, 68, 0.4)"
              : "1px dashed rgba(34, 197, 94, 0.4)",
          }}
        />
        <div
          tw="absolute -bottom-28 -left-28 w-96 h-96"
          style={{
            transform: "rotate(45deg)",
            border: "2px solid rgba(59, 130, 246, 0.2)",
            background: "rgba(17, 24, 39, 0.3)",
          }}
        />

        {/* 上部バー: タイトル & ステータスバッジ */}
        <div tw="flex items-center justify-between w-full z-10">
          <div tw="flex items-center">
            <div
              tw="w-4 h-4 rounded-sm mr-3"
              style={{
                backgroundColor: isBankrupt ? "#ef4444" : "#22c55e",
              }}
            />
            <span tw="text-xl font-bold tracking-widest text-gray-300">
              TIGER PITCH // AI VALUATION DASHBOARD
            </span>
          </div>

          <div
            tw="flex items-center px-5 py-2 rounded-full text-lg font-bold"
            style={{
              backgroundColor: isBankrupt
                ? "rgba(127, 29, 29, 0.7)"
                : "rgba(20, 83, 45, 0.7)",
              border: isBankrupt
                ? "1px solid rgba(239, 68, 68, 0.8)"
                : "1px solid rgba(34, 197, 94, 0.8)",
              color: isBankrupt ? "#fca5a5" : "#86efac",
            }}
          >
            {isBankrupt ? "STATUS: BANKRUPT" : "STATUS: DEAL CLOSED"}
          </div>
        </div>

        {/* 中央メインコンテンツ: 最終資金調達額 または メンタルブレイク表示 */}
        <div
          tw="flex flex-col items-center justify-center my-auto py-10 px-12 rounded-3xl z-10"
          style={{
            backgroundColor: "rgba(3, 7, 18, 0.78)",
            border: isBankrupt
              ? "2px solid rgba(239, 68, 68, 0.55)"
              : "2px solid rgba(34, 197, 94, 0.5)",
            boxShadow: isBankrupt
              ? "0 0 60px rgba(239, 68, 68, 0.2)"
              : "0 0 60px rgba(34, 197, 94, 0.2)",
          }}
        >
          {isBankrupt ? (
            <div tw="flex flex-col items-center">
              <span
                tw="text-2xl font-bold tracking-widest mb-2"
                style={{ color: "#f87171" }}
              >
                MENTAL HP DEPLETED (0%)
              </span>
              <div
                tw="text-6xl font-black tracking-tight mb-4"
                style={{ color: "#ef4444" }}
              >
                メンタルブレイク（破産）
              </div>
              <div tw="text-3xl font-bold text-gray-400">
                最終資金調達額: {formattedScore}
              </div>
            </div>
          ) : (
            <div tw="flex flex-col items-center">
              <span tw="text-2xl font-bold tracking-widest text-gray-400 mb-3">
                FINAL TOTAL VALUATION
              </span>
              <div tw="text-4xl font-bold text-gray-200 mb-2">
                最終資金調達額:
              </div>
              <div
                tw="text-7xl font-black tracking-tight"
                style={{ color: "#4ade80" }}
              >
                {formattedScore}
              </div>
            </div>
          )}
        </div>

        {/* 下部フッター: Universal Make Associates ロゴ & サイバーライン */}
        <div tw="flex items-center justify-between w-full z-10 pt-2">
          <div tw="flex items-center">
            <span tw="text-sm text-gray-500 tracking-widest">
              5 AI INVESTORS // REAL-TIME NEGOTIATION SIMULATOR
            </span>
          </div>

          <div tw="flex items-center">
            <div
              tw="w-2.5 h-2.5 rounded-full mr-2.5"
              style={{ backgroundColor: "#3b82f6" }}
            />
            <span tw="text-xl font-bold tracking-wider text-gray-200">
              Universal Make Associates
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
