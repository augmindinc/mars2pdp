import fs from "fs/promises";
import path from "path";
import { GeminiAgent } from "./geminiAgent.js";

async function runTask8(targetId) {
    const agent = new GeminiAgent();
    const filePath = path.join(process.cwd(), "outputs", targetId, "NEW_DETAILS_KO.md");
    const koText = await fs.readFile(filePath, "utf-8");

    const targetLang = process.argv[3]; // Optional: EN, JA, ZH

    const allLanguages = [
        { code: "EN", name: "English" },
        { code: "JA", name: "Japanese" },
        { code: "ZH", name: "Chinese (Simplified)" }
    ];

    const languages = targetLang
        ? allLanguages.filter(l => l.code.toUpperCase() === targetLang.toUpperCase())
        : [];

    if (languages.length === 0 && !targetLang) {
        console.log("ℹ️ No target language specified. Usage: node src/task8.js <targetId> <EN|JA|ZH>");
        return;
    } else if (languages.length === 0) {
        console.log(`❌ Unsupported language code: ${targetLang}`);
        return;
    }

    for (const lang of languages) {
        console.log(`Translating to ${lang.name}...`);
        const prompt = `
            너는 '나노바나나' 번역 에이전트야.
            다음 한국어 상품 상세 페이지 내용을 ${lang.name}로 번역해줘. 
            단순 번역이 아닌, 해당 언어권의 이커머스 감성에 맞게 의역해줘.
            이미지 설명 부분([이미지: ...])은 그대로 두거나 번역해서 포함해줘.

            내용:
            ${koText}
        `;
        const result = await agent.generateText(prompt);
        if (result) {
            const outPath = path.join(process.cwd(), "outputs", targetId, `NEW_DETAILS_${lang.code}.md`);
            await fs.writeFile(outPath, result);
            console.log(`✅ Saved: ${outPath}`);
        }
    }
}

const targetId = process.argv[2];
if (!targetId) {
    console.log("Usage: node src/task8.js <targetId> [EN|JA|ZH]");
    process.exit(1);
}
runTask8(targetId).catch(console.error);
