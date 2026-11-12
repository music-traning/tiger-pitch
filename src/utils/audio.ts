"use client";

/**
 * Web Audio API を用いたリアルタイム効果音（SE）シンセサイザー
 * 外部音声ファイルを使用せず、オシレーターとゲインノードで波形を合成します。
 */

let audioCtx: AudioContext | null = null;
let lastTypingSoundTime = 0;

// 複数メッセージ同時タイピング時のノイズ・音割れを防ぐ最小再生間隔（ms）
const TYPING_SOUND_THROTTLE_MS = 50;

/**
 * AudioContext の取得・初期化（ブラウザのAutoplayポリシー対応）
 * ユーザーの初回クリック・送信イベント等で呼び出してアンロックします。
 */
export function initAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {
      // ユーザー操作前の呼び出し等でresumeできない場合は無視
    });
  }

  return audioCtx;
}

/**
 * ダメージ音（ドスッという重い衝撃音）を再生
 * - triangle / sine オシレーターで 150Hz → 10Hz へ 0.15秒で急激にスイープ
 * - GainNode で同時に音量を減衰
 */
export function playDamageSound(): void {
  const ctx = initAudio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.16;

    // メインの重低音キック（triangle波）
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + duration);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);

    // サブの胴鳴り（sine波）を重ねて「ドスッ」という厚みを補強
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(12, now + duration);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + duration);
  } catch {
    // AudioContext未許可環境等での例外を安全に無視
  }
}

/**
 * タイプライター音（ポポポポというレトロな電子音）を再生
 * - square 波オシレーター（600Hz〜800Hz付近）
 * - 0.03秒の極短エンベロープ＆低ゲイン設計
 * - スロットル制御により複数吹き出し同時再生時も耳障りなノイズを防止
 */
export function playTypingSound(): void {
  if (typeof performance !== "undefined") {
    const nowMs = performance.now();
    if (nowMs - lastTypingSoundTime < TYPING_SOUND_THROTTLE_MS) {
      return;
    }
    lastTypingSoundTime = nowMs;
  }

  const ctx = initAudio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.03;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    // 680Hz〜740Hz付近でわずかに揺らぎを持たせ、レトロRPGの心地よいポポポ感を演出
    const freq = 680 + Math.random() * 60;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + duration);

    // 耳障りにならないよう極めて低いGainから即座に減衰
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // AudioContext未許可環境等での例外を安全に無視
  }
}
