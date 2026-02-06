import fs from "fs/promises";
import path from "path";
import { GeminiAgent } from "./geminiAgent.js";

async function runTask4_1(targetId) {
    const agent = new GeminiAgent();
    const baseDir = path.join(process.cwd(), "outputs", targetId);
    const imagesDir = path.join(baseDir, "images");
    const prodDir = path.join(imagesDir, "prod");

    await fs.mkdir(prodDir, { recursive: true });

    const files = await fs.readdir(imagesDir);
    const imageFiles = files.filter(f => f.endsWith(".jpg") || f.endsWith(".png"));

    console.log(`Analyzing ${imageFiles.length} images for ${targetId}...`);

    for (const file of imageFiles) {
        const filePath = path.join(imagesDir, file);

        // Step 1: Analyze if it's a good product image
        const analysisPrompt = `
            너는 '나노바나나(Nano Banana)' 이미지 에이전트야. 
            이 이미지가 상품의 특징을 가장 잘 보여주는 '단독 상품 이미지' 또는 '깨끗한 상세 이미지'인지 판단해줘.
            불필요한 한글 텍스트나 잡음이 많은 이미지는 제외하고, 상품 본연의 형태가 잘 드러난 이미지만 골라야 해.
            
            결과를 다음 JSON 형식으로만 답해줘:
            {
                "is_good": true/false,
                "reason": "이유 설명",
                "cutout_prompt": "이 상품만 남기고 배경을 완벽하게 제거(Remove Background)하여 투명 배경의 PNG로 만들기 위한 상세 기술 프롬프트 (영어)"
            }
        `;
        const result = await agent.analyzeImage(filePath, analysisPrompt);
        console.log(`Analyzing ${file}...`);
        console.log(`Raw Gemini Response for ${file}:`, result);

        try {
            const parsed = JSON.parse(result.replace(/```json|```/g, "").trim());
            if (parsed.is_good) {
                console.log(`✅ Selected for Cutout: ${file}`);
                // 실제 생성 로직은 나중에 쿼터 회복 시 실행되도록 로직 구성 (예시 프롬프트 출력)
                console.log(`[나노바나나 누끼 로직] 프롬프트: ${parsed.cutout_prompt}`);

                // 여기에서 실제로 generate_image(prompt: parsed.cutout_prompt, imagePaths: [filePath]) 호출 예정
                const destPath = path.join(prodDir, file);
                await fs.copyFile(filePath, destPath);
            }
        } catch (e) {
            console.error("Analysis Parsing Error:", result);
        }
    }
}

const targetId = process.argv[2] || "domeggook-63319623";
runTask4_1(targetId).catch(console.error);
