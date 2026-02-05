import fs from "fs/promises";
import path from "path";
import { GeminiAgent } from "./geminiAgent.js";

async function runTask7(targetId) {
    const agent = new GeminiAgent();
    const filePath = path.join(process.cwd(), "outputs", targetId, "README.md");
    const ocrText = await fs.readFile(filePath, "utf-8");

    const prompt = `
        너는 '나노바나나' UI/UX 및 MD 에이전트야.
        아래의 상품 정보를 바탕으로 새롭고 프리미엄한 한글 상품 상세 페이지를 구성해줘.

        [요구사항]
        1. 타겟 고객군(1인 가구, 설날 선물용, 맞벌이 가정)이 동질감을 느끼도록 따뜻하고 감성적인 톤앤매너 유지.
        2. 다음 섹션을 반드시 포함: 
           - 상품소개 (감성 문구 포함)
           - 상품명 (Hong Food 일반미 떡국 세트)
           - 소재/원재료 (OCR 데이터 활용)
           - 색상 (화이트/레드 포인트)
           - 사이즈 및 상세 실측 (이미지 데이터 기반)
           - 구매 전 유의사항
           - 제조국 (대한민국)
           - 품질보증기준
           - 배송안내
           - 교환/반품 안내
           - 고객센터 (효정무역)

        3. 이미지 배치 전략 (이미지 컷 구성)도 텍스트 중간중간 [이미지: 설명] 형태로 넣어줘. (앞서 생성한 shot_1~10, synthesis_1~3 활용)

        OCR 데이터:
        ${ocrText}
    `;

    const result = await agent.generateText(prompt);
    if (result) {
        const outPath = path.join(process.cwd(), "outputs", targetId, "NEW_DETAILS_KO.md");
        await fs.writeFile(outPath, result);
        console.log(`✅ Task 7 Complete: Saved to ${outPath}`);
    }
}

const targetId = process.argv[2] || "domeggook-63319623";
runTask7(targetId).catch(console.error);
