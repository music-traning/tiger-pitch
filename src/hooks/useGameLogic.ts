"use client";

import { useReducer, useCallback, useState, useEffect, useRef } from "react";
import {
  Gamepad2,
  Flame,
  Sparkles,
  Wrench,
  Feather,
  type LucideIcon,
} from "lucide-react";
import { initAudio, playDamageSound, playSuccessSound } from "@/utils/audio";

// ==========================================
// 1. 型定義 (Types)
// ==========================================

export type TigerId = "niche" | "party" | "innovator" | "boss" | "strategist";

export type GameStatus = "idle" | "playing" | "gameover" | "deal_closed";

export type ChatRole = "user" | "tiger";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  message: string;
  tigerId?: TigerId;
}

export type TigerScores = Record<TigerId, number>;

export interface GameState {
  /** メンタルHP（初期値: 100, 0以下でゲームオーバー） */
  mentalHp: number;
  /** 現在の合計出資額（初期値: 0, 最大1億円 = 100,000,000） */
  totalValuation: number;
  /** チャット履歴 */
  chatHistory: ChatMessage[];
  /** 5人の虎それぞれの現在の出資額 */
  tigerScores: TigerScores;
  /** アイデアの弱点となる「宿敵」の虎のID */
  nemesis: TigerId | null;
  /** ユーザーが最初に提案した事業アイデアの要約 */
  ideaSummary: string;
  /** 現在のターン数（初期値: 0, 初回ピッチで1） */
  currentTurn: number;
  /** 最大ターン数（定数: 5） */
  maxTurns: number;
  /** ゲーム進行状態 */
  gameStatus: GameStatus;
}

export interface TigerMaster {
  id: TigerId;
  name: string;
  icon: LucideIcon;
}

export interface TigerEvaluationInput {
  tigerId: TigerId;
  /** 更新後の出資提示額（円） */
  newScore: number;
  /** 虎からのコメント */
  message: string;
}

// ==========================================
// 2. 定数・マスターデータ定義 (Constants)
// ==========================================

export const MAX_TOTAL_VALUATION = 100_000_000; // 最大合計1億円
export const MAX_TIGER_VALUATION = 20_000_000; // 虎1人あたりの基準上限（2,000万円 × 5人 = 1億円）
export const INITIAL_MENTAL_HP = 100;
export const MAX_TURNS = 5; // 最大5ターン制限

/** 5人の虎のマスターデータ */
export const TIGERS: readonly TigerMaster[] = [
  { id: "niche", name: "ニッチな熱血社長", icon: Gamepad2 },
  { id: "party", name: "パーティーロッカー", icon: Flame },
  { id: "innovator", name: "完璧主義のイノベーター", icon: Sparkles },
  { id: "boss", name: "関西の親方", icon: Wrench },
  { id: "strategist", name: "天才軍師", icon: Feather },
] as const;

export const INITIAL_TIGER_SCORES: TigerScores = {
  niche: 0,
  party: 0,
  innovator: 0,
  boss: 0,
  strategist: 0,
};

export const INITIAL_STATE: GameState = {
  mentalHp: INITIAL_MENTAL_HP,
  totalValuation: 0,
  chatHistory: [],
  tigerScores: { ...INITIAL_TIGER_SCORES },
  nemesis: null,
  ideaSummary: "",
  currentTurn: 0,
  maxTurns: MAX_TURNS,
  gameStatus: "idle",
};

// ==========================================
// 3. Action 定義 (Actions)
// ==========================================

export type GameAction =
  | {
      type: "START_GAME";
      payload?: {
        initialPitch?: string;
        nemesis?: TigerId;
      };
    }
  | {
      type: "ADD_USER_MESSAGE";
      payload: {
        message: string;
      };
    }
  | {
      type: "RECEIVE_EVALUATIONS";
      payload: {
        evaluations: TigerEvaluationInput[];
        nemesis?: TigerId;
      };
    }
  | {
      type: "GAME_OVER";
    }
  | {
      type: "CLOSE_DEAL";
    }
  | {
      type: "RESET_GAME";
    };

// ==========================================
// 4. ヘルパー関数 (Helpers)
// ==========================================

function createMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 虎たちの出資額合計を算出（最大1億円にクランプ）
 */
function calculateTotalValuation(scores: TigerScores): number {
  const sum = Object.values(scores).reduce((acc, val) => acc + val, 0);
  return Math.min(MAX_TOTAL_VALUATION, Math.max(0, sum));
}

/**
 * 前回スコアからの下落幅に応じてメンタルHPの減少量を計算する
 * - 100万円（1,000,000円）の下落につき 5 HP ダメージ
 * - 宿敵（nemesis）からの評価下落はダメージ 1.5倍
 */
function calculateMentalDamage(
  prevScores: TigerScores,
  nextScores: TigerScores,
  nemesis: TigerId | null
): number {
  let totalDamage = 0;

  (Object.keys(prevScores) as TigerId[]).forEach((tigerId) => {
    const prev = prevScores[tigerId];
    const next = nextScores[tigerId];
    const drop = Math.max(0, prev - next);

    if (drop > 0) {
      // 100万円下落ごとに5ダメージ（端数切り上げ）
      const baseDamage = Math.ceil(drop / 1_000_000) * 5;
      const multiplier = nemesis === tigerId ? 1.5 : 1.0;
      totalDamage += Math.round(baseDamage * multiplier);
    }
  });

  return totalDamage;
}

/**
 * 5人の評価コメントからタイムラインに表示する最大3名を選出する
 * 1. 現在の nemesis（宿敵）のコメントは絶対に追加
 * 2. 残りの虎から「前回からのスコア変動幅（絶対値）」が最も大きかった上位2名を選出
 */
function selectTopThreeEvaluations(
  evaluations: TigerEvaluationInput[],
  prevScores: TigerScores,
  nemesis: TigerId | null
): TigerEvaluationInput[] {
  const validEvals = evaluations.filter((item) => item.message.trim() !== "");
  if (validEvals.length <= 3) {
    return validEvals;
  }

  const selectedIds = new Set<TigerId>();

  // 1. 宿敵を最優先で確保
  if (nemesis && validEvals.some((e) => e.tigerId === nemesis)) {
    selectedIds.add(nemesis);
  }

  // 2. 残りの虎をスコア変動幅（絶対値）の降順でソートして上位を選出
  const remaining = validEvals
    .filter((e) => !selectedIds.has(e.tigerId))
    .map((e) => {
      const prev = prevScores[e.tigerId] ?? 0;
      const next = Math.max(0, e.newScore);
      const absDiff = Math.abs(next - prev);
      return { item: e, absDiff, next };
    })
    .sort((a, b) => {
      if (b.absDiff !== a.absDiff) return b.absDiff - a.absDiff;
      return b.next - a.next;
    });

  for (const entry of remaining) {
    if (selectedIds.size >= 3) break;
    selectedIds.add(entry.item.tigerId);
  }

  // 元の順序を維持して最大3名分を返却
  return validEvals.filter((e) => selectedIds.has(e.tigerId));
}

// ==========================================
// 5. Reducer 実装
// ==========================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const pitchText =
        action.payload?.initialPitch?.trim() ||
        "AIを活用した次世代のサブスク型猫カフェ事業を提案します！";

      // 指定がなければランダムな虎をダミーの宿敵(nemesis)に設定
      const randomTigerId =
        TIGERS[Math.floor(Math.random() * TIGERS.length)].id;
      const selectedNemesis = action.payload?.nemesis ?? randomTigerId;

      const initialMessage: ChatMessage = {
        id: createMessageId("user"),
        role: "user",
        message: pitchText,
      };

      return {
        ...INITIAL_STATE,
        gameStatus: "playing",
        nemesis: selectedNemesis,
        ideaSummary: pitchText,
        currentTurn: 1,
        maxTurns: MAX_TURNS,
        chatHistory: [initialMessage],
      };
    }

    case "ADD_USER_MESSAGE": {
      if (state.gameStatus !== "playing") {
        return state;
      }

      const newMessage: ChatMessage = {
        id: createMessageId("user"),
        role: "user",
        message: action.payload.message,
      };

      return {
        ...state,
        currentTurn: Math.min(state.maxTurns, state.currentTurn + 1),
        chatHistory: [...state.chatHistory, newMessage],
      };
    }

    case "RECEIVE_EVALUATIONS": {
      if (state.gameStatus !== "playing") {
        return state;
      }

      const nextNemesis = action.payload.nemesis ?? state.nemesis;
      const nextScores: TigerScores = { ...state.tigerScores };

      // 1. 5人全員分の出資額スコア変動はすべて反映する
      action.payload.evaluations.forEach((evalItem) => {
        const clampedScore = Math.max(0, evalItem.newScore);
        nextScores[evalItem.tigerId] = clampedScore;
      });

      // 2. チャット履歴に表示する発言者を最大3名（宿敵 + 変動幅上位2名）に絞り込む
      const filteredEvaluations = selectTopThreeEvaluations(
        action.payload.evaluations,
        state.tigerScores,
        nextNemesis
      );

      const newMessages: ChatMessage[] = filteredEvaluations.map((evalItem) => ({
        id: createMessageId(`tiger-${evalItem.tigerId}`),
        role: "tiger",
        tigerId: evalItem.tigerId,
        message: evalItem.message,
      }));

      const nextTotalValuation = calculateTotalValuation(nextScores);
      const damage = calculateMentalDamage(
        state.tigerScores,
        nextScores,
        nextNemesis
      );
      const nextMentalHp = Math.max(0, state.mentalHp - damage);

      // 3. 終了判定:
      // - メンタルHPが0以下なら gameover（破産）
      // - 最終ターン（currentTurn >= maxTurns）の評価完了時は自動的に deal_closed（ディール強制成立）
      let nextGameStatus: GameStatus = state.gameStatus;
      if (nextMentalHp <= 0) {
        nextGameStatus = "gameover";
      } else if (state.currentTurn >= state.maxTurns) {
        nextGameStatus = "deal_closed";
      }

      return {
        ...state,
        nemesis: nextNemesis,
        tigerScores: nextScores,
        totalValuation: nextTotalValuation,
        chatHistory: [...state.chatHistory, ...newMessages],
        mentalHp: nextMentalHp,
        gameStatus: nextGameStatus,
      };
    }

    case "GAME_OVER": {
      return {
        ...state,
        mentalHp: 0,
        gameStatus: "gameover",
      };
    }

    case "CLOSE_DEAL": {
      if (state.gameStatus !== "playing") {
        return state;
      }
      return {
        ...state,
        gameStatus: "deal_closed",
      };
    }

    case "RESET_GAME": {
      return {
        ...INITIAL_STATE,
        tigerScores: { ...INITIAL_TIGER_SCORES },
      };
    }

    default:
      return state;
  }
}

// ==========================================
// 6. カスタムフック (useGameLogic)
// ==========================================

export function useGameLogic() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [isTakingDamage, setIsTakingDamage] = useState(false);
  const [isValuationUp, setIsValuationUp] = useState(false);
  const [tigerDeltas, setTigerDeltas] = useState<TigerScores>({
    ...INITIAL_TIGER_SCORES,
  });

  const prevMentalHpRef = useRef<number>(state.mentalHp);
  const prevTotalValuationRef = useRef<number>(state.totalValuation);
  const prevTigerScoresRef = useRef<TigerScores>({ ...state.tigerScores });

  // メンタルHPの減少を監視し、ダメージ演出フラグ（isTakingDamage）を400ms間ONにする＆ダメージSE再生
  useEffect(() => {
    if (state.mentalHp < prevMentalHpRef.current) {
      setIsTakingDamage(true);
      playDamageSound();
      const timer = setTimeout(() => {
        setIsTakingDamage(false);
      }, 400);

      prevMentalHpRef.current = state.mentalHp;
      return () => clearTimeout(timer);
    }

    setIsTakingDamage(false);
    prevMentalHpRef.current = state.mentalHp;
  }, [state.mentalHp]);

  // 合計評価額（totalValuation）および個別スコアの上昇を監視し、ポジティブ演出（チャリンSE・緑発光・+¥バッジ）を発火
  useEffect(() => {
    const prevTotal = prevTotalValuationRef.current;
    const prevScores = prevTigerScoresRef.current;

    // リセット時やゲーム開始時（0に戻った時）
    if (state.gameStatus === "idle" || state.chatHistory.length <= 1) {
      setIsValuationUp(false);
      setTigerDeltas({ ...INITIAL_TIGER_SCORES });
      prevTotalValuationRef.current = state.totalValuation;
      prevTigerScoresRef.current = { ...state.tigerScores };
      return;
    }

    // 各虎の前回比プラス幅を計算
    const newDeltas: TigerScores = { ...INITIAL_TIGER_SCORES };
    let hasAnyPositiveDelta = false;
    (Object.keys(state.tigerScores) as TigerId[]).forEach((tigerId) => {
      const diff = state.tigerScores[tigerId] - (prevScores[tigerId] ?? 0);
      if (diff > 0) {
        newDeltas[tigerId] = diff;
        hasAnyPositiveDelta = true;
      }
    });

    const isTotalIncreased = state.totalValuation > prevTotal;

    prevTotalValuationRef.current = state.totalValuation;
    prevTigerScoresRef.current = { ...state.tigerScores };

    if (isTotalIncreased || hasAnyPositiveDelta) {
      if (isTotalIncreased) {
        setIsValuationUp(true);
        playSuccessSound();
      }
      if (hasAnyPositiveDelta) {
        setTigerDeltas(newDeltas);
      }

      const flashTimer = setTimeout(() => {
        setIsValuationUp(false);
      }, 500);

      const deltaTimer = setTimeout(() => {
        setTigerDeltas({ ...INITIAL_TIGER_SCORES });
      }, 1500);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(deltaTimer);
      };
    }
  }, [state.totalValuation, state.tigerScores, state.gameStatus, state.chatHistory.length]);

  /** ゲーム開始（初回ピッチ送信） */
  const startGame = useCallback(
    (initialPitch?: string, nemesis?: TigerId) => {
      initAudio();
      dispatch({
        type: "START_GAME",
        payload: { initialPitch, nemesis },
      });
    },
    []
  );

  /** ユーザーの反論メッセージを追加 */
  const addUserMessage = useCallback((message: string) => {
    dispatch({
      type: "ADD_USER_MESSAGE",
      payload: { message },
    });
  }, []);

  /** 虎たちからの評価を受信 */
  const receiveEvaluations = useCallback(
    (evaluations: TigerEvaluationInput[], nemesis?: TigerId) => {
      dispatch({
        type: "RECEIVE_EVALUATIONS",
        payload: { evaluations, nemesis },
      });
    },
    []
  );

  /** ゲームオーバーにする */
  const triggerGameOver = useCallback(() => {
    dispatch({ type: "GAME_OVER" });
  }, []);

  /** 現在の出資額でディールを成立させる */
  const closeDeal = useCallback(() => {
    dispatch({ type: "CLOSE_DEAL" });
  }, []);

  /** ゲーム状態を初期値にリセット（デバッグ・再プレイ用） */
  const resetGame = useCallback(() => {
    dispatch({ type: "RESET_GAME" });
  }, []);

  return {
    state,
    dispatch,
    tigers: TIGERS,
    isTakingDamage,
    isValuationUp,
    tigerDeltas,
    actions: {
      startGame,
      addUserMessage,
      receiveEvaluations,
      triggerGameOver,
      closeDeal,
      resetGame,
    },
  };
}
