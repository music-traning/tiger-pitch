"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  ShieldAlert,
  TrendingUp,
  Award,
  Skull,
  RotateCcw,
  SlidersHorizontal,
  Handshake,
  Loader2,
  Trophy,
  Crown,
  CircleHelp,
} from "lucide-react";
import {
  useGameLogic,
  type TigerId,
  type ChatMessage,
} from "@/hooks/useGameLogic";
import TypewriterText from "@/components/TypewriterText";
import HelpModal from "@/components/HelpModal";
import { initAudio } from "@/utils/audio";
import type { EvaluateResponseData } from "@/app/api/evaluate/route";
import type { RankingRecord } from "@/utils/supabase";

export default function TigerPitchPage() {
  const router = useRouter();
  const {
    state,
    tigers,
    isTakingDamage,
    isValuationUp,
    tigerDeltas,
    actions,
  } = useGameLogic();
  const [inputText, setInputText] = useState("");
  const [initialIdea, setInitialIdea] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Phase 4: ランキング登録＆リーダーボード表示用State
  const [playerName, setPlayerName] = useState("");
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const isGameEnded =
    state.gameStatus === "gameover" || state.gameStatus === "deal_closed";
  const isCriticalHp = state.mentalHp <= 30;

  // チャットエリア最下部への自動スクロール関数
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    chatEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // 新しいメッセージが追加されたら自動で最下部へスクロール
  useEffect(() => {
    scrollToBottom("smooth");
  }, [state.chatHistory, scrollToBottom]);

  // 虎のマスターデータをIDから逆引きするヘルパー
  const getTigerById = (tigerId?: TigerId | string) => {
    if (!tigerId) return undefined;
    return tigers.find((t) => t.id === tigerId);
  };

  // バックエンド (/api/evaluate) を呼び出して5人の虎のAI評価を取得・反映
  const requestAiEvaluation = async (
    ideaText: string,
    updatedHistory: ChatMessage[],
    isFirstTurn: boolean
  ) => {
    setIsEvaluating(true);
    setApiError(null);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaText,
          chatHistory: updatedHistory,
        }),
      });

      const data = (await res.json()) as EvaluateResponseData & {
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || `API Error (${res.status})`);
      }

      // 0〜20点のスコアを1点=100万円（最大2,000万円/人）の出資額に換算
      const evaluations = data.evaluations.map((item) => ({
        tigerId: item.id,
        newScore: item.score * 1_000_000,
        message: item.comment,
      }));

      // 初回ターンはAIが選定した宿敵(nemesis)を採用、以降は既存の宿敵を維持
      actions.receiveEvaluations(
        evaluations,
        isFirstTurn ? data.nemesis : undefined
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "AI評価の取得中にエラーが発生しました。";
      setApiError(msg);
    } finally {
      setIsEvaluating(false);
    }
  };

  // ピッチ開始または反論送信の共通処理
  const sendPitchOrReply = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isGameEnded || isEvaluating) return;

    // ユーザー操作タイミングでAudioContextをアンロック・resume
    initAudio();

    const isFirstTurn = state.gameStatus === "idle";
    const currentIdea = isFirstTurn ? trimmed : initialIdea || trimmed;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      message: trimmed,
    };

    const nextHistory = isFirstTurn
      ? [userMsg]
      : [...state.chatHistory, userMsg];

    if (isFirstTurn) {
      setInitialIdea(trimmed);
      actions.startGame(trimmed);
    } else {
      actions.addUserMessage(trimmed);
    }

    setInputText("");
    await requestAiEvaluation(currentIdea, nextHistory, isFirstTurn);
  };

  // メッセージ送信ハンドラ
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendPitchOrReply(inputText);
  };

  // ランキング一覧（上位20件）を取得してリーダーボード画面へ切り替え
  const fetchAndOpenLeaderboard = useCallback(async () => {
    setShowLeaderboard(true);
    setIsLoadingRankings(true);
    setRankingError(null);

    try {
      const res = await fetch("/api/rankings", { method: "GET" });
      const data = (await res.json()) as {
        rankings?: RankingRecord[];
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || `API Error (${res.status})`);
      }

      setRankings(data.rankings ?? []);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "ランキングの取得に失敗しました。";
      setRankingError(msg);
    } finally {
      setIsLoadingRankings(false);
    }
  }, []);

  // スコアを POST /api/rankings に登録してリーダーボードへ遷移
  const handleRegisterRanking = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim();
    if (!trimmedName || isSubmittingScore) return;

    setIsSubmittingScore(true);
    setRankingError(null);

    const finalValuation =
      state.gameStatus === "deal_closed" ? state.totalValuation : 0;
    const status =
      state.gameStatus === "deal_closed" ? "deal_closed" : "bankrupt";
    const ideaSummary =
      state.ideaSummary ||
      initialIdea ||
      state.chatHistory.find((m) => m.role === "user")?.message ||
      "（アイデア記録なし）";

    try {
      const res = await fetch("/api/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: trimmedName,
          idea_summary: ideaSummary,
          final_valuation: finalValuation,
          nemesis_id: state.nemesis ?? "strategist",
          status,
        }),
      });

      const data = (await res.json()) as {
        ranking?: RankingRecord;
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || `API Error (${res.status})`);
      }

      if (data.ranking?.id) {
        router.push(`/result/${data.ranking.id}`);
        return;
      }

      await fetchAndOpenLeaderboard();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "ランキング登録中にエラーが発生しました。";
      setRankingError(msg);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // ゲーム初期化＆再挑戦ハンドラ
  const handleRestartGame = () => {
    actions.resetGame();
    setShowLeaderboard(false);
    setPlayerName("");
    setInitialIdea("");
    setInputText("");
    setApiError(null);
    setRankingError(null);
  };

  // デバッグ・動作確認用: 好意的な査定（出資額UP）
  const handleDummyPositive = () => {
    if (state.gameStatus === "idle") {
      const sample = "AIとIoTを活用した次世代型スマートサウナ事業を提案します！";
      setInitialIdea(sample);
      actions.startGame(sample);
      return;
    }
    actions.receiveEvaluations([
      {
        tigerId: "niche",
        newScore: state.tigerScores.niche + 5_000_000,
        message: "そのニッチな着眼点、嫌いじゃないぜ！500万上乗せだ！",
      },
      {
        tigerId: "party",
        newScore: state.tigerScores.party + 6_000_000,
        message: "バイブス最高じゃん！一気にスケールさせようぜ！",
      },
      {
        tigerId: "innovator",
        newScore: state.tigerScores.innovator + 4_000_000,
        message: "UXの設計思想に一定の合理性を感じます。出資しましょう。",
      },
      {
        tigerId: "boss",
        newScore: state.tigerScores.boss + 3_000_000,
        message: "現場の熱量が伝わってきたわ。応援したる！",
      },
      {
        tigerId: "strategist",
        newScore: state.tigerScores.strategist + 5_000_000,
        message: "参入障壁の構築ロジックが明確ですね。評価を引き上げます。",
      },
    ]);
  };

  // デバッグ・動作確認用: 辛辣な査定（出資額DOWN & メンタルHP減少）
  const handleDummyNegative = () => {
    if (state.gameStatus === "idle") {
      const sample = "AIとIoTを活用した次世代型スマートサウナ事業を提案します！";
      setInitialIdea(sample);
      actions.startGame(sample);
      return;
    }
    if (state.totalValuation === 0) {
      actions.receiveEvaluations([
        {
          tigerId: "niche",
          newScore: 5_000_000,
          message: "",
        },
        {
          tigerId: "innovator",
          newScore: 5_000_000,
          message: "",
        },
      ]);
      setTimeout(() => {
        actions.receiveEvaluations([
          {
            tigerId: "niche",
            newScore: 2_000_000,
            message:
              "おいおい、ターゲット層が曖昧すぎるぞ！出資額は引き下げる！",
          },
          {
            tigerId: "innovator",
            newScore: 1_000_000,
            message:
              "解像度が低すぎます。美しいプロダクトとは到底呼べません。",
          },
        ]);
      }, 20);
      return;
    }
    actions.receiveEvaluations([
      {
        tigerId: "niche",
        newScore: Math.max(0, state.tigerScores.niche - 3_000_000),
        message: "おいおい、ターゲット層が曖昧すぎるぞ！出資額は引き下げる！",
      },
      {
        tigerId: "innovator",
        newScore: Math.max(0, state.tigerScores.innovator - 4_000_000),
        message: "解像度が低すぎます。美しいプロダクトとは到底呼べません。",
      },
      {
        tigerId: "strategist",
        newScore: Math.max(0, state.tigerScores.strategist - 3_000_000),
        message: "競合が模倣した瞬間に崩壊するスキームです。減額します。",
      },
    ]);
  };

  // 順位ごとの金・銀・銅スタイルを返すヘルパー
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) {
      return {
        row: "bg-yellow-950/20 border-yellow-500/40",
        badge:
          "bg-yellow-500/20 text-yellow-300 border border-yellow-400/60 shadow-[0_0_10px_rgba(234,179,8,0.25)]",
        nameText: "text-yellow-300 font-bold",
        valuationText: "text-yellow-400 font-bold",
      };
    }
    if (rank === 2) {
      return {
        row: "bg-slate-800/30 border-slate-400/40",
        badge: "bg-slate-400/20 text-slate-200 border border-slate-300/50",
        nameText: "text-slate-200 font-bold",
        valuationText: "text-slate-200 font-bold",
      };
    }
    if (rank === 3) {
      return {
        row: "bg-amber-950/25 border-amber-600/40",
        badge: "bg-amber-700/25 text-amber-400 border border-amber-500/50",
        nameText: "text-amber-400 font-bold",
        valuationText: "text-amber-400 font-bold",
      };
    }
    return {
      row: "bg-gray-900/60 border-gray-800/80",
      badge: "bg-gray-800 text-gray-400 border border-gray-700",
      nameText: "text-gray-200 font-medium",
      valuationText: "text-green-400 font-semibold",
    };
  };

  return (
    <div
      className={`bg-black min-h-screen text-gray-100 ${
        isTakingDamage ? "animate-shake" : ""
      }`}
    >
      {/* ダメージ時の全画面レッドフラッシュ演出オーバーレイ */}
      <div
        className={`fixed inset-0 pointer-events-none z-50 ${
          isTakingDamage ? "animate-flashRed" : ""
        }`}
      />

      {/* 評価額アップ時の全画面グリーンフラッシュ演出オーバーレイ */}
      <div
        className={`fixed inset-0 pointer-events-none z-50 ${
          isValuationUp ? "animate-flashGreen" : ""
        }`}
      />

      {/* ルートコンテナ: スマホサイズ固定 & 3分割フレックスレイアウト */}
      <div className="max-w-md mx-auto h-screen flex flex-col bg-gray-950 border-x border-gray-800/80 shadow-2xl relative overflow-hidden">
        {showLeaderboard ? (
          /* ==========================================
              B. リーダーボード（ランキング画面）UI
          ========================================== */
          <div className="flex flex-col h-full bg-gray-950">
            {/* リーダーボードヘッダー */}
            <header className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-4 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold tracking-wide text-white uppercase font-mono">
                      TIGER PITCH LEADERBOARD
                    </h1>
                    <p className="text-[11px] text-gray-400">
                      歴代起業家 出資獲得ランキング TOP 20
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-gray-800 text-green-400 border border-gray-700">
                  TOP 20
                </span>
              </div>
            </header>

            {/* ランキングテーブル（スクロール領域） */}
            <main className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoadingRankings ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3 text-gray-400 font-mono text-xs">
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                  <span>ランキングデータを取得中...</span>
                </div>
              ) : rankingError ? (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 space-y-2">
                  <div className="font-bold text-red-400">
                    ランキング取得エラー
                  </div>
                  <div>{rankingError}</div>
                  <button
                    type="button"
                    onClick={() => void fetchAndOpenLeaderboard()}
                    className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 text-white text-xs cursor-pointer"
                  >
                    再試行
                  </button>
                </div>
              ) : rankings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-gray-500">
                  <Trophy className="w-8 h-8 text-gray-700" />
                  <p className="text-xs">
                    まだランキングデータがありません。最初の記録者になりましょう！
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/90 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                        <th className="py-2.5 pl-3 pr-1.5 w-12">順位</th>
                        <th className="py-2.5 px-2">起業家 / アイデア要約</th>
                        <th className="py-2.5 px-2 text-center w-12">宿敵</th>
                        <th className="py-2.5 pl-2 pr-3 text-right">
                          最終出資額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/70 text-xs">
                      {rankings.map((record, idx) => {
                        const rank = idx + 1;
                        const style = getRankBadgeStyle(rank);
                        const nemesisTiger = getTigerById(record.nemesis_id);
                        const NemesisIcon = nemesisTiger?.icon ?? ShieldAlert;

                        return (
                          <tr
                            key={record.id ?? `${record.player_name}-${idx}`}
                            className={`transition-colors hover:bg-gray-800/40 ${style.row}`}
                          >
                            {/* 1. 順位 */}
                            <td className="py-3 pl-3 pr-1.5 align-middle">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs font-bold ${style.badge}`}
                              >
                                {rank <= 3 ? (
                                  <span className="flex items-center gap-0.5">
                                    <Crown className="w-3 h-3" />
                                    {rank}
                                  </span>
                                ) : (
                                  rank
                                )}
                              </span>
                            </td>

                            {/* 2. 起業家名 & 3. アイデア要約 */}
                            <td className="py-3 px-2 align-middle max-w-[160px]">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`truncate text-xs ${style.nameText}`}
                                >
                                  {record.player_name}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 ${
                                    record.status === "deal_closed"
                                      ? "bg-green-950/80 text-green-400 border border-green-800/60"
                                      : "bg-red-950/80 text-red-400 border border-red-800/60"
                                  }`}
                                >
                                  {record.status === "deal_closed"
                                    ? "DEAL"
                                    : "BANKRUPT"}
                                </span>
                              </div>
                              <p
                                className="text-[11px] text-gray-400 line-clamp-1 mt-0.5"
                                title={record.idea_summary}
                              >
                                {record.idea_summary}
                              </p>
                            </td>

                            {/* 4. 宿敵アイコン */}
                            <td className="py-3 px-2 align-middle text-center">
                              <div
                                className="inline-flex flex-col items-center justify-center"
                                title={
                                  nemesisTiger
                                    ? `宿敵: ${nemesisTiger.name}`
                                    : "宿敵"
                                }
                              >
                                <div className="w-7 h-7 rounded-full bg-red-950/40 border border-red-800/70 flex items-center justify-center text-red-400">
                                  <NemesisIcon className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </td>

                            {/* 5. 最終出資額 */}
                            <td className="py-3 pl-2 pr-3 align-middle text-right font-mono whitespace-nowrap">
                              <span className={`text-xs ${style.valuationText}`}>
                                ¥{record.final_valuation.toLocaleString("ja-JP")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </main>

            {/* リーダーボード下部固定フッター: 再挑戦ボタン & クレジット */}
            <footer className="sticky bottom-0 z-20 bg-gray-900 border-t border-gray-800 px-3 pt-3 pb-2 space-y-2 shrink-0">
              <button
                type="button"
                onClick={handleRestartGame}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition shadow-lg cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>新しいアイデアで再挑戦する</span>
              </button>
              <div className="text-center">
                <a
                  href="https://note.com/jazzy_begin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition"
                >
                  ©2026 buro
                </a>
              </div>
            </footer>
          </div>
        ) : (
          <>
            {/* ==========================================
                A. ヘッダー（Sticky Top）
            ========================================== */}
            <header className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 shrink-0">
              {/* 1. メンタルHPバー（最上部端から端まで伸びる細いプログレスバー） */}
              <div className="w-full h-1 bg-gray-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    isCriticalHp
                      ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                      : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, state.mentalHp))}%`,
                  }}
                />
              </div>

              <div className="px-4 pt-3 pb-3 space-y-3">
                {/* ステータス上部バー: Mental HP 数値 & ターン数 & ランキング / Dev トグル */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 uppercase tracking-wider">
                        HP
                      </span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded ${
                          isCriticalHp
                            ? "bg-red-950/80 text-red-400 border border-red-800/60 animate-pulse"
                            : "bg-gray-800 text-emerald-400"
                        }`}
                      >
                        {state.mentalHp}%
                      </span>
                    </div>

                    {/* 現在のターン表示（最終ターン 5/5 は赤文字＆点滅でプレッシャー付与） */}
                    <div
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                        state.currentTurn >= state.maxTurns
                          ? "bg-red-950/80 text-red-400 border-red-700/80 animate-pulse"
                          : "bg-gray-800/90 text-gray-300 border-gray-700/70"
                      }`}
                    >
                      現在のターン: {state.currentTurn} / {state.maxTurns}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800/90 hover:bg-gray-700 text-green-400 hover:text-green-300 border border-gray-700/80 transition cursor-pointer font-bold text-xs"
                      title="ゲームのルール・ヘルプを見る"
                      aria-label="ヘルプ"
                    >
                      ?
                    </button>
                    <button
                      type="button"
                      onClick={() => void fetchAndOpenLeaderboard()}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800/80 hover:bg-gray-700 text-yellow-400 border border-gray-700/60 transition cursor-pointer text-[10px]"
                      title="ランキングを見る"
                    >
                      <Trophy className="w-3 h-3" />
                      <span>RANKING</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDevTools((prev) => !prev)}
                      className="p-1 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700/60 transition cursor-pointer"
                      title="テスト用コントロールパネル表示切替"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* デバッグ・シミュレート用ミニパネル（開閉可能） */}
                {showDevTools && (
                  <div className="p-2 rounded-lg bg-gray-950/90 border border-gray-800 flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        const sample =
                          "AIとIoTを活用した次世代型スマートサウナ事業を提案します！";
                        setInitialIdea(sample);
                        actions.startGame(sample);
                      }}
                      className="px-2 py-1 rounded bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 border border-blue-700/50 cursor-pointer"
                    >
                      START
                    </button>
                    <button
                      type="button"
                      onClick={handleDummyPositive}
                      className="px-2 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/50 cursor-pointer"
                    >
                      +査定UP
                    </button>
                    <button
                      type="button"
                      onClick={handleDummyNegative}
                      className="px-2 py-1 rounded bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border border-amber-700/50 cursor-pointer"
                    >
                      -査定DOWN
                    </button>
                    <button
                      type="button"
                      onClick={actions.triggerGameOver}
                      className="px-2 py-1 rounded bg-red-900/60 hover:bg-red-800/80 text-red-200 border border-red-700/50 cursor-pointer"
                    >
                      GAMEOVER
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartGame}
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 cursor-pointer"
                    >
                      RESET
                    </button>
                  </div>
                )}

                {/* 2. 総評価額表示（中央・通貨フォーマット・デジタル等幅フォント） */}
                <div className="text-center py-1 bg-gray-950/60 rounded-xl border border-gray-800/80 shadow-inner">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-0.5">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span>Total Valuation</span>
                  </div>
                  <div className="font-mono text-green-400 text-3xl font-bold tracking-tight drop-shadow-[0_0_10px_rgba(74,222,128,0.25)]">
                    ¥{state.totalValuation.toLocaleString("ja-JP")}
                  </div>
                </div>

                {/* 3. 審査員ステータス（5人の虎アイコン横並び + 個別出資額 + 宿敵エフェクト + 増額ポップアップ） */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {tigers.map((tiger) => {
                    const IconComponent = tiger.icon;
                    const isNemesis = state.nemesis === tiger.id;
                    const score = state.tigerScores[tiger.id];
                    const delta = tigerDeltas[tiger.id] ?? 0;

                    return (
                      <div
                        key={tiger.id}
                        className={`relative flex flex-col items-center justify-between p-1.5 rounded-lg border transition-all ${
                          isNemesis
                            ? "border-red-500 bg-red-950/30 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse"
                            : delta > 0
                            ? "border-green-500/80 bg-green-950/25 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                            : "border-gray-800 bg-gray-950/50"
                        }`}
                        title={`${tiger.name}${
                          isNemesis ? " (宿敵 / NEMESIS)" : ""
                        }`}
                      >
                        {/* 出資額UP時のフロートアップ緑バッジ演出 */}
                        {delta > 0 && (
                          <div
                            key={`${tiger.id}-${score}`}
                            className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded-full bg-green-500 text-gray-950 font-mono text-[9px] font-extrabold whitespace-nowrap shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-floatUp"
                          >
                            +¥{delta.toLocaleString("ja-JP")}
                          </div>
                        )}

                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 border border-gray-700/80 mb-1">
                          <IconComponent
                            className={`w-4 h-4 ${
                              isNemesis
                                ? "text-red-400"
                                : score > 0
                                ? "text-green-400"
                                : "text-gray-400"
                            }`}
                          />
                          {isNemesis && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white shadow">
                              !
                            </span>
                          )}
                        </div>

                        <span className="text-[9px] text-gray-400 truncate w-full text-center leading-tight mb-0.5">
                          {tiger.name}
                        </span>

                        <span
                          className={`font-mono text-[10px] font-semibold tracking-tighter truncate w-full text-center ${
                            isNemesis
                              ? "text-red-400"
                              : score > 0
                              ? "text-green-400"
                              : "text-gray-500"
                          }`}
                        >
                          ¥{score.toLocaleString("ja-JP")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </header>

            {/* ==========================================
                B. メインチャットエリア（スクロール領域）
            ========================================== */}
            <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
              {state.chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-green-400 shadow-lg">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-sm font-bold text-gray-200 tracking-wide">
                      TIGER PITCH ROOM へようこそ
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      下のフォームから最初のビジネスプラン（ピッチ）を送信して交渉を開始してください。右上アイコンから査定シミュレーションも可能です。
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void sendPitchOrReply(
                          "AIとIoTを活用した次世代型スマートサウナ事業を提案します！"
                        )
                      }
                      disabled={isEvaluating}
                      className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-xs font-mono text-green-400 border border-gray-800 transition cursor-pointer disabled:opacity-50"
                    >
                      サンプルピッチで即座に開始 →
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-xs font-mono text-gray-300 border border-gray-800 transition cursor-pointer"
                    >
                      <CircleHelp className="w-3.5 h-3.5 text-green-400" />
                      <span>ルールを見る</span>
                    </button>
                  </div>
                </div>
              ) : (
                state.chatHistory.map((item) => {
                  if (item.role === "user") {
                    // ユーザーの吹き出し（右寄せ・青背景・白文字）
                    return (
                      <div key={item.id} className="flex justify-end">
                        <div className="max-w-[82%] space-y-1">
                          <div className="text-[10px] text-gray-500 text-right pr-1 font-mono">
                            YOU (FOUNDER)
                          </div>
                          <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-md leading-relaxed break-words">
                            {item.message}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 虎の吹き出し（左寄せ・ダークグレー背景・アイコンと名前付き）
                  const tiger = getTigerById(item.tigerId);
                  const TigerIcon = tiger?.icon ?? ShieldAlert;
                  const isNemesis =
                    item.tigerId !== undefined &&
                    state.nemesis === item.tigerId;

                  return (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${
                          isNemesis
                            ? "bg-red-950/60 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                            : "bg-gray-900 border-gray-700 text-gray-300"
                        }`}
                      >
                        <TigerIcon className="w-4 h-4" />
                      </div>

                      <div className="max-w-[80%] space-y-1">
                        <div className="flex items-center gap-1.5 pl-0.5">
                          <span
                            className={`text-xs font-bold ${
                              isNemesis ? "text-red-400" : "text-gray-300"
                            }`}
                          >
                            {tiger?.name ?? "審査員"}
                          </span>
                          {isNemesis && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800/80 uppercase">
                              NEMESIS
                            </span>
                          )}
                        </div>

                        <TypewriterText
                          text={item.message}
                          speed={30}
                          onProgress={() => scrollToBottom("instant")}
                          onComplete={() => scrollToBottom("smooth")}
                          className={`bg-gray-800 text-gray-100 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-md leading-relaxed break-words border ${
                            isNemesis
                              ? "border-red-900/60"
                              : "border-gray-700/60"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}

              {/* AI審査中のローディング表示 */}
              {isEvaluating && (
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-900/80 border border-gray-800 px-3.5 py-2.5 rounded-xl w-fit animate-pulse">
                  <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                  <span>5人の虎が査定中...</span>
                </div>
              )}

              {/* APIエラー表示 */}
              {apiError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 space-y-1">
                  <div className="font-bold text-red-400">API通信エラー</div>
                  <div>{apiError}</div>
                </div>
              )}

              <div ref={chatEndRef} />
            </main>

            {/* ==========================================
                C. フッター（Sticky Bottom）
            ========================================== */}
            <footer className="sticky bottom-0 z-20 bg-gray-900 border-t border-gray-800 px-3 pt-3 pb-2 space-y-2 shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                {/* ディール成立ボタン（左側・アウトライン警告色・CLOSE_DEAL発火） */}
                <button
                  type="button"
                  onClick={actions.closeDeal}
                  disabled={isGameEnded || state.gameStatus !== "playing"}
                  className="flex items-center gap-1 px-2.5 py-2.5 rounded-lg border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/20 text-xs font-semibold whitespace-nowrap transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  title="現在の評価額でディールを成立させて撤退する"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  <span>撤退 / 成立</span>
                </button>

                {/* 反論入力エリア */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isGameEnded || isEvaluating}
                  placeholder={
                    isGameEnded
                      ? "交渉は終了しました"
                      : isEvaluating
                      ? "虎たちの発言を待っています..."
                      : state.gameStatus === "idle"
                      ? "最初のビジネスプランを入力..."
                      : "虎への反論・アピールを入力..."
                  }
                  className="flex-1 min-w-0 bg-gray-950 text-gray-100 placeholder-gray-500 text-sm px-3.5 py-2.5 rounded-lg border border-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* 送信ボタン */}
                <button
                  type="submit"
                  disabled={isGameEnded || isEvaluating || !inputText.trim()}
                  className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
                  aria-label="送信"
                >
                  {isEvaluating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>

              <div className="text-center">
                <a
                  href="https://note.com/jazzy_begin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition"
                >
                  ©2026 buro
                </a>
              </div>
            </footer>

            {/* ==========================================
                D. ステータスごとのオーバーレイ表示 & ランキング登録フォーム
            ========================================== */}
            {state.gameStatus === "gameover" && (
              <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
                <div className="w-full max-w-sm bg-gray-900 border border-red-800/80 rounded-2xl p-5 text-center space-y-4 shadow-[0_0_40px_rgba(220,38,38,0.25)]">
                  <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-700 flex items-center justify-center mx-auto text-red-500 animate-pulse">
                    <Skull className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-red-400">
                      MENTAL HP DEPLETED (0%) / BANKRUPT
                    </p>
                    <h2 className="text-lg font-bold text-white">
                      メンタルブレイク...（交渉決裂）
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      虎たちからの追及に耐えきれず、すべての出資オファーは白紙（¥0）となりました。
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 font-mono">
                    <div className="text-[10px] text-gray-500 uppercase">
                      最終獲得資金（最終評価額）
                    </div>
                    <div className="text-xl font-bold text-red-500">¥0</div>
                  </div>

                  {/* スコア登録フォーム */}
                  <form
                    onSubmit={(e) => void handleRegisterRanking(e)}
                    className="space-y-2.5 text-left"
                  >
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        プレイヤー名（起業家名 / 社名）
                      </label>
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="例: 渋谷のサウナ王"
                        maxLength={30}
                        disabled={isSubmittingScore}
                        className="w-full bg-gray-950 text-gray-100 placeholder-gray-600 text-sm px-3 py-2 rounded-lg border border-gray-800 focus:outline-none focus:border-red-500"
                      />
                    </div>

                    {rankingError && (
                      <p className="text-[11px] text-red-400">{rankingError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={!playerName.trim() || isSubmittingScore}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition shadow-lg disabled:opacity-40 cursor-pointer"
                    >
                      {isSubmittingScore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trophy className="w-4 h-4" />
                      )}
                      <span>ランキングに登録する</span>
                    </button>
                  </form>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void fetchAndOpenLeaderboard()}
                      className="flex-1 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition cursor-pointer"
                    >
                      ランキングを見る
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartGame}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>再挑戦する</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {state.gameStatus === "deal_closed" && (
              <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
                <div className="w-full max-w-sm bg-gray-900 border border-green-700/70 rounded-2xl p-5 text-center space-y-4 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                  <div className="w-14 h-14 rounded-full bg-green-950/80 border border-green-600 flex items-center justify-center mx-auto text-green-400">
                    <Award className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-green-400">
                      DEAL CLOSED SUCCESSFULLY
                    </p>
                    <h2 className="text-lg font-bold text-white">
                      ディール成立！ 最終獲得資金: ¥
                      {state.totalValuation.toLocaleString("ja-JP")}
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      メンタルが尽きる前に交渉をまとめ上げ、出資枠を確定させました。
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                    <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                      確定バリュエーション（最終評価額）
                    </div>
                    <div className="font-mono text-2xl font-bold text-green-400">
                      ¥{state.totalValuation.toLocaleString("ja-JP")}
                    </div>
                  </div>

                  {/* スコア登録フォーム */}
                  <form
                    onSubmit={(e) => void handleRegisterRanking(e)}
                    className="space-y-2.5 text-left"
                  >
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        プレイヤー名（起業家名 / 社名）
                      </label>
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="例: ネオ・サウナ株式会社"
                        maxLength={30}
                        disabled={isSubmittingScore}
                        className="w-full bg-gray-950 text-gray-100 placeholder-gray-600 text-sm px-3 py-2 rounded-lg border border-gray-800 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    {rankingError && (
                      <p className="text-[11px] text-red-400">{rankingError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={!playerName.trim() || isSubmittingScore}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-xs transition shadow-lg disabled:opacity-40 cursor-pointer"
                    >
                      {isSubmittingScore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trophy className="w-4 h-4" />
                      )}
                      <span>ランキングに登録する</span>
                    </button>
                  </form>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void fetchAndOpenLeaderboard()}
                      className="flex-1 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition cursor-pointer"
                    >
                      ランキングを見る
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartGame}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>再挑戦する</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ゲームルール・ヘルプモーダル */}
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      </div>
    </div>
  );
}
