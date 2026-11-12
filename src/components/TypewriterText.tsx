"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { playTypingSound } from "@/utils/audio";

export interface TypewriterTextProps {
  /** 表示するフルテキスト */
  text: string;
  /** 1文字を表示する間隔（ミリ秒）。デフォルトは30ms */
  speed?: number;
  /** 全文字の表示が完了した際に発火するコールバック */
  onComplete?: () => void;
  /** 文字が追加されるたびに発火するコールバック（自動スクロール追従用） */
  onProgress?: () => void;
  /** 追加のクラス名 */
  className?: string;
}

export default function TypewriterText({
  text,
  speed = 30,
  onComplete,
  onProgress,
  className = "",
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);

  // 最新コールバックの参照を保持
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // タイマークリア用ヘルパー
  const clearTypingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // text が変わったら初期化して1文字ずつ表示を開始
  useEffect(() => {
    clearTypingTimer();

    const chars = Array.from(text);
    if (chars.length === 0) {
      setDisplayedText("");
      setIsCompleted(true);
      onCompleteRef.current?.();
      return;
    }

    indexRef.current = 0;
    setDisplayedText("");
    setIsCompleted(false);

    const tick = () => {
      const currentChar = chars[indexRef.current] ?? "";
      indexRef.current += 1;
      const nextSlice = chars.slice(0, indexRef.current).join("");
      setDisplayedText(nextSlice);

      // 空白文字以外の文字が表示されるタイミングでタイプライター音を鳴らす
      if (currentChar.trim() !== "") {
        playTypingSound();
      }

      onProgressRef.current?.();

      if (indexRef.current < chars.length) {
        timerRef.current = setTimeout(tick, speed);
      } else {
        timerRef.current = null;
        setIsCompleted(true);
        onCompleteRef.current?.();
      }
    };

    timerRef.current = setTimeout(tick, speed);

    return () => {
      clearTypingTimer();
    };
  }, [text, speed, clearTypingTimer]);

  // タップ/クリックで即座に全文字表示するスキップ機能
  const handleSkip = () => {
    if (isCompleted) return;
    clearTypingTimer();
    setDisplayedText(text);
    setIsCompleted(true);
    onProgressRef.current?.();
    onCompleteRef.current?.();
  };

  return (
    <div
      onClick={handleSkip}
      title={!isCompleted ? "クリックでスキップ" : undefined}
      className={`${!isCompleted ? "cursor-pointer select-none" : ""} ${className}`}
    >
      <span>{displayedText}</span>
      {!isCompleted && (
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-green-400/80 animate-pulse"
        />
      )}
    </div>
  );
}
