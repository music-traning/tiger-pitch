import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, TigerId } from "@/hooks/useGameLogic";

const SYSTEM_INSTRUCTION = `あなたは5人の冷酷な投資家（虎）をシミュレートするシステムです。
ユーザーの事業アイデアとこれまでの交渉履歴を踏まえ、5人それぞれの視点から評価（0〜20点）と、論理的で辛辣なコメントを出力してください。
全員が100点をつけることは絶対にあり得ません。1つの強みは別の投資家にとって弱みになるように評価をブレさせてください。

[虎の設定]
1. niche (ニッチな熱血社長): 大衆向けを嫌う。ターゲットが極限まで絞られた熱狂的なアイデアのみ高評価。
2. party (パーティーロッカー): ノリ、スピード感、直感的な面白さを重視。小難しくて修行のような仕様は減点。
3. innovator (完璧主義のイノベーター): 究極のUXと革新的な技術のみ評価。UIや技術選定に妥協や矛盾があれば容赦なく0点。
4. boss (関西の親方): 実用性とコスト削減がすべて。「誰がなんぼで買ってどう儲かるんや」という泥臭いビジネスモデル以外は減点。
5. strategist (天才軍師): 大局的な戦略と市場の隙を突く戦術を評価。行き当たりばったりな方針変更を嫌う。

出力は以下のJSONスキーマに従うこと。
{
  "evaluations": [
    { "id": "niche", "score": 数値(0-20), "comment": "辛辣なコメント" },
    { "id": "party", "score": 数値(0-20), "comment": "辛辣なコメント" },
    { "id": "innovator", "score": 数値(0-20), "comment": "辛辣なコメント" },
    { "id": "boss", "score": 数値(0-20), "comment": "辛辣なコメント" },
    { "id": "strategist", "score": 数値(0-20), "comment": "辛辣なコメント" }
  ],
  "nemesis": "アイデアの弱点を最も突く虎のidを1つ選定（初回のみ重要、以降は固定で構わない）"
}`;

const VALID_TIGER_IDS: readonly TigerId[] = [
  "niche",
  "party",
  "innovator",
  "boss",
  "strategist",
];

export interface EvaluateRequestBody {
  idea: string;
  chatHistory: ChatMessage[];
}

export interface RawTigerEvaluation {
  id: TigerId;
  score: number;
  comment: string;
}

export interface EvaluateResponseData {
  evaluations: RawTigerEvaluation[];
  nemesis: TigerId;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY が設定されていません。.env.local を確認してください。",
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Partial<EvaluateRequestBody>;
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";
    const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];

    if (!idea) {
      return NextResponse.json(
        { error: "事業アイデア (idea) が指定されていません。" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // 会話履歴をテキスト整形してプロンプトに付与
    const formattedHistory =
      chatHistory.length > 0
        ? chatHistory
            .map((msg) => {
              if (msg.role === "user") {
                return `【志願者 (User)】: ${msg.message}`;
              }
              return `【虎 (${msg.tigerId ?? "unknown"})】: ${msg.message}`;
            })
            .join("\n")
        : "（まだ会話履歴はありません。初回ピッチです）";

    const prompt = `## ユーザーが最初に提示した事業アイデア
${idea}

## 現在までの交渉履歴
${formattedHistory}

上記の事業アイデアと最新の交渉状況を踏まえ、5人の虎それぞれの視点から評価スコア（0〜20の整数）と辛辣なコメント、および宿敵（nemesis）を指定のJSON形式で出力してください。`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed: Partial<EvaluateResponseData>;
    try {
      parsed = JSON.parse(responseText) as Partial<EvaluateResponseData>;
    } catch {
      return NextResponse.json(
        {
          error: "AIからのJSONレスポンスの解析に失敗しました。",
          raw: responseText,
        },
        { status: 502 }
      );
    }

    // バリデーションと正規化（0〜20点にクランプ）
    const evaluations: RawTigerEvaluation[] = VALID_TIGER_IDS.map((tigerId) => {
      const found = Array.isArray(parsed.evaluations)
        ? parsed.evaluations.find((item) => item?.id === tigerId)
        : undefined;

      const rawScore =
        typeof found?.score === "number" && !Number.isNaN(found.score)
          ? Math.round(found.score)
          : 0;
      const clampedScore = Math.max(0, Math.min(20, rawScore));
      const comment =
        typeof found?.comment === "string" && found.comment.trim() !== ""
          ? found.comment.trim()
          : "……様子見だな。";

      return {
        id: tigerId,
        score: clampedScore,
        comment,
      };
    });

    const nemesis: TigerId =
      parsed.nemesis && VALID_TIGER_IDS.includes(parsed.nemesis)
        ? parsed.nemesis
        : "strategist";

    return NextResponse.json({
      evaluations,
      nemesis,
    } satisfies EvaluateResponseData);
  } catch (error) {
    console.error("[POST /api/evaluate] Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "AI評価の生成中に予期せぬエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
