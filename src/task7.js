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
            1. 타겟 고객군이 동질감을 느끼도록 따뜻하고 감성적인 톤앤매너 유지.
            2. 상품의 실제 정보를 기반으로 다음 섹션을 포함해줘: 
               - 상품소개 (감성 문구 포함)
               - 상품명 (정확한 상품 명칭 사용)
               - 소재/원재료 (OCR 데이터 및 상세 정보 활용)
               - 주요 특징 (성능, 맛, 디자인 등 상품 카테고리에 맞는 특징)
               - 사이즈 및 상세 실측 (상세 정보 기반)
               - 구매 전 유의사항
               - 제조국/브랜드 정보
               - 배송/교환/반품 안내 (공급사 정보 및 반품 정책 활용)
               - 고객센터 안내

            3. 이미지 배치 전략 (이미지 컷 구성)도 텍스트 중간중간 [이미지: 이름 - 설명] 형태로 넣어줘. 
               - 앞서 추출/선별된 핵심 이미지(shot_1~3, banner_ko 등)를 맥락에 맞게 최적으로 배치해.
               - 박스 이미지 생성은 지양하고 실제 내용물과 조리/사용 컷 위주로 구성해.

            OCR 및 수집된 데이터:
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
