import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { generateEmbedding, summarizeCode } from "./gemini";
import { db } from "@/server/db";

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || process.env.GITHUB_TOKEN,
    branch: "main",
    ignoreFiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
    ],
    recursive: true,
    unknown: "warn",
    maxConcurrency: 5,
  });
  const docs = await loader.load();
  return docs;
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  const docs = await loadGithubRepo(githubUrl, githubToken);

  const embeddings = await generateEmbeddings(docs);

  let processedCount = 0;
  for (const embedding of embeddings) {
    if (!embedding) continue;

    try {
      const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
        data: {
          summary: embedding.summary,
          sourceCode: embedding.sourceCode,
          fileName: embedding.fileName,
          projectId,
        },
      });

      await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embedding}::vector
        WHERE "id" = ${sourceCodeEmbedding.id}`;

      processedCount++;
      
    } catch (error) {
      console.error(`Error saving embedding for ${embedding.fileName}:`, error);
    }
  }

};

type EmbeddingResult = {
  embedding: number[];
  summary: string;
  sourceCode: string;
  fileName: string;
} | null;

async function generateEmbeddings(
  docs: Document[],
): Promise<EmbeddingResult[]> {
  console.log("Starting to generate embeddings...");
  const results: EmbeddingResult[] = [];

  for (const doc of docs) {
    try {

      // Get summary first
      const summary = await summarizeCode(doc);

      // Then get embedding
      const embedding = await generateEmbedding(summary);

      results.push({
        embedding,
        summary,
        sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
        fileName: doc.metadata.source,
      });
    } catch (error) {
      console.error(error);
      results.push(null); // Push null for failed documents
    }
  }

  return results;
}




