"use client";

import {
  X,
  CircleHelp,
  TrendingUp,
  HeartPulse,
  ShieldAlert,
  Handshake,
  Gamepad2,
  Flame,
  Sparkles,
  Wrench,
  Feather,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[88dvh] flex flex-col bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gray-950/90 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <CircleHelp className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              TIGER PITCH ルール＆攻略ガイド
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* モーダル本文（スクロール領域: min-h-0 と明示的な max-h で確実にスクロール可能にする） */}
        <div className="flex-1 min-h-0 max-h-[calc(88dvh-7.5rem)] overflow-y-auto overscroll-contain p-4 space-y-5 text-xs text-gray-300 leading-relaxed">
          {/* 1. ゲームの目的 */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-green-400 text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>1. ゲームの目的：目指せ1億円調達！</span>
            </div>
            <p className="text-gray-300 bg-gray-950/70 p-3 rounded-xl border border-gray-800">
              あなたは起業家として、性格も評価軸も全く異なる<strong>5人の冷酷なAI投資家（虎）</strong>に事業アイデアをプレゼンします。
              虎1人あたりの出資上限は<strong>2,000万円</strong>（5人合計で<strong>最大1億円</strong>）。
              追及に耐えながら交渉を重ね、最高額でのディール成立を目指しましょう！
            </p>
          </section>

          {/* 2. メンタルHPと破産システム */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-red-400 text-xs">
              <HeartPulse className="w-4 h-4" />
              <span>2. メンタルHPと「破産（BANKRUPT）」</span>
            </div>
            <div className="bg-gray-950/70 p-3 rounded-xl border border-gray-800 space-y-2">
              <p>
                全員から100点をもらうことは不可能です。誰かの意見に合わせて方針を変えると、別の虎が失望して<strong>出資額を引き下げる</strong>ことがあります。
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>
                  初期メンタルHPは <strong className="text-emerald-400">100%</strong>
                </li>
                <li>
                  前回より出資額が下がると、<strong>100万円減額ごとに -5%</strong> のメンタルダメージ！
                </li>
                <li>
                  HPが <strong className="text-red-400">0%</strong> になると<strong>「メンタルブレイク（交渉決裂）」</strong>となり、獲得資金は <strong>¥0</strong> になります。
                </li>
              </ul>
            </div>
          </section>

          {/* 3. 宿敵（NEMESIS）システム */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-rose-400 text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span>3. 宿敵（NEMESIS）に要注意！</span>
            </div>
            <p className="bg-red-950/25 p-3 rounded-xl border border-red-900/60 text-gray-200">
              初回ピッチ後、あなたのアイデアの弱点を最も鋭く突く虎1人が<strong className="text-red-400">「宿敵（NEMESIS）」</strong>として赤く発光します。
              宿敵からの減額は精神的ショックが大きく、<strong>メンタルダメージが 1.5倍</strong> に跳ね上がります。
            </p>
          </section>

          {/* 4. 引き際の判断（撤退 / 成立） */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
              <Handshake className="w-4 h-4" />
              <span>4. 引き際の判断：「撤退 / 成立」ボタン</span>
            </div>
            <p className="bg-gray-950/70 p-3 rounded-xl border border-gray-800">
              画面左下の<strong className="text-amber-400">「撤退 / 成立」</strong>ボタンを押すと、その時点の総評価額でディールを確定させて安全に勝ち逃げできます。
              もう1ターン粘って増額を狙うか、メンタルが尽きる前に手堅く確定させるかの駆け引きが勝負の鍵です！
            </p>
          </section>

          {/* 5. 5人の虎のプロファイル */}
          <section className="space-y-2">
            <div className="font-bold text-blue-400 text-xs">
              5. 5人のAI投資家（虎）の攻略ヒント
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-950/70 border border-gray-800">
                <div className="w-7 h-7 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 text-green-400 mt-0.5">
                  <Gamepad2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white">ニッチな熱血社長</div>
                  <div className="text-[11px] text-gray-400">
                    「誰にでもウケる」大衆向けを嫌う。ターゲットを極限まで絞った熱狂的なアイデアを高評価。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-950/70 border border-gray-800">
                <div className="w-7 h-7 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 text-orange-400 mt-0.5">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white">パーティーロッカー</div>
                  <div className="text-[11px] text-gray-400">
                    ノリ・スピード感・直感的な面白さを重視。小難しくて修行のような仕様は即減点。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-950/70 border border-gray-800">
                <div className="w-7 h-7 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 text-purple-400 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white">
                    完璧主義のイノベーター
                  </div>
                  <div className="text-[11px] text-gray-400">
                    究極のUXと革新的な技術のみ評価。UIや技術選定に妥協や矛盾があれば容赦なく0円。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-950/70 border border-gray-800">
                <div className="w-7 h-7 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 text-yellow-400 mt-0.5">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white">関西の親方</div>
                  <div className="text-[11px] text-gray-400">
                    実用性とコスト感覚がすべて。「誰がなんぼで買ってどう儲かるんや」という泥臭い収益モデルを好む。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-950/70 border border-gray-800">
                <div className="w-7 h-7 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5">
                  <Feather className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white">天才軍師</div>
                  <div className="text-[11px] text-gray-400">
                    大局的な市場戦略と参入障壁を評価。指摘に流されて軸がブレる方針変更を最も嫌う。
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* モーダルフッター */}
        <div className="p-3 bg-gray-950 border-t border-gray-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
          >
            理解した！交渉に戻る
          </button>
        </div>
      </div>
    </div>
  );
}
