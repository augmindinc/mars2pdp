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
        const prompt = `
            너는 '나노바나나' 이미지 에이전트야. 
            이 이미지가 상품의 특징을 잘 보여주는 '단독 상품 이미지' 또는 '깨끗한 상세 이미지'인지 판단해줘.
            만약 상품이 잘 드러난다면 'YES', 그렇지 않다면 'NO'라고 답해줘.
            이 상품은 알리익스프레스/도매꾹에서 수집된 상품이야.
        `;
        const result = await agent.analyzeImage(filePath, prompt);
        console.log(`Image ${file}: ${result?.trim()}`);

        if (result?.includes("YES")) {
            const destPath = path.join(prodDir, file);
            await fs.copyFile(filePath, destPath);
            console.log(`✅ Extracted: ${file} -> ${prodDir}`);
        }
    }
}

const targetId = process.argv[2] || "domeggook-63319623";
runTask4_1(targetId).catch(console.error);
