import fs from "fs/promises";
import path from "path";
import { GeminiAgent } from "./geminiAgent.js";

async function runTask4_2(targetId) {
    const agent = new GeminiAgent();
    const baseDir = path.join(process.cwd(), "outputs", targetId);
    const prodDir = path.join(baseDir, "images", "prod");

    // 1. Get product features using Nano Banana's analysis
    const files = await fs.readdir(prodDir);
    const mainImg = files.find(f => f.startsWith("thumb_") || f.startsWith("detail_"));

    if (!mainImg) return;

    const analysisPrompt = `
        너는 '나노바나나(Nano Banana)' 크리에이티브 MD 에이전트야.
        첨부된 상품 원본 이미지를 분석해서, 이 상품의 '핵심 실물 피처'를 5가지 키워드로 뽑아줘.
        단, 실제 존재하지 않는 허위 패키징이나 박스는 제외하고 오직 '상품 내용물'과 '실제 조리/사용 모습'에 집중해.
        
        그리고 이 피처들을 활용해서 가장 임팩트 있는 **3가지** 다른 구도의 프리미엄 상품샷을 생성하기 위한 
        나노바나나 전용 이미지 생성 프롬프트(영어)를 JSON 배열로 만들어줘.
        
        {
            "features": ["키워드1", "키워드2", ...],
            "prompts": [
                "Detailed prompt for shot 1 (Main Hero Shot)...",
                "Detailed prompt for shot 2 (Action/Usage Shot)...",
                "Detailed prompt for shot 3 (Texture/Macro Shot)..."
            ]
        }
    `;

    const result = await agent.analyzeImage(path.join(prodDir, mainImg), analysisPrompt);
    console.log("--- 나노바나나 상품샷 생성 로직 (분석 결과) ---");
    console.log(result);

    // 쿼터 리셋 후 이 프롬프트들을 사용하여 generate_image를 순차 실행하는 로직이 올 예정입니다.
    const outPath = path.join(baseDir, "GENERATION_PLAN.json");
    await fs.writeFile(outPath, result);
    console.log(`✅ 생성 로직 전개 완료: ${outPath} 에 저장됨.`);
}

const targetId = process.argv[2] || "domeggook-9011007";
runTask4_2(targetId).catch(console.error);
