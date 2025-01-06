"use server";

import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateEmbedding } from "@/lib/gemini";
import { db } from "@/server/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function askQuestion(question: string, projectId: string) {
  const stream = createStreamableValue();

  const queryVector = await generateEmbedding(question);
  const vectorQuery = `[${queryVector.join(",")}]`;

  const result = await db.$queryRaw`
    SELECT "fileName","sourceCode","summary",
    1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
    FROM "SourceCodeEmbedding"
    WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > .5
    AND "projectId" = ${projectId}
    ORDER BY similarity DESC
    LIMIT 10
    ` as { fileName: string; sourceCode: string; summary: string }[];

  let context = "";

  for (const doc of result) {
    context += `source: ${doc.fileName}\n code content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`;
  }

  (async () => {
    const { textStream } = await streamText({
      model: google("gemini-1.5-flash"),
      prompt: `
            You are a AI code assistant who answers questions about the codebase. Your target audience is a technical intern who is looking to understand the codebase.
            AI assistant is a brand new, powerful, human-like artificial intelligence.
            The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
            AI is a well-behaved and well-mannered individual.
            AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
            AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
            If the question is asking about code or a specific file, AI will provide the detailed answer, giving step by step instructions, including code snippets.
            START CONTEXT BLOCK
            ${context}
            END OF CONTEXT BLOCK

            START OF QUESTION
            ${question}
            END OF QUESTION
            AI assistant will take into account any CONTENT BLOCK that is provided in a conversation.
            If the context does not provide the answer to question. The AI assistant will say, "I'm sorry, but I don't know the answer !!".
            AI assistant will not apologize for previous reponses, but instead will indicate new information was gained.
            AI assistant will not invent anything that is not drawn directly from the context.
            Answer in markdown syntax, with code snippets if needed. Be as detailed as possible when answering.
            `,
    });
    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();
  return {
    output: stream.value,
    fileReference: result,
  };
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
export async function summarizeRepo(projectId: string) {
  try {
    const result = (await db.$queryRaw`
    SELECT "fileName","sourceCode","summary"
    FROM "SourceCodeEmbedding"
    WHERE "projectId" = ${projectId}
    `) as { fileName: string; sourceCode: string; summary: string }[];

    let context = "";

    for (const doc of result) {
      context += `source: ${doc.fileName}\n code content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`;
    }

    const response = await model.generateContent([
      `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects.
    You are onboarding a junior software engineer and explaining them the code repository containing various files and folders.
    Each file in repository have \`source:\` , \`code content:\` and \`summary of file:\`.
    The repository is provide below, where each file have its source, code content and summary.
    Here is repository code:
    ---
    ${context}
    ---
    Provide a detailed summary of the repository, explaining what it is used for.`,
    ]);
    const text = response.response.text();
    return text;
  } catch (error) {
    console.log("error summarizing the repo: ", error);
  }
}



export async function repoStructure(projectId:string){
  try{
    const result = (await db.$queryRaw`
      SELECT "fileName"
      FROM "SourceCodeEmbedding"
      WHERE "projectId" = ${projectId}
      `) as { fileName: string; }[];
  
      let context = "";
  
      for (const doc of result) {
        context += `source: ${doc.fileName}\n `;
      }
      const response = await model.generateContent([
        `You are an intelligent senior software engineer who specialises in reading github repositories.
      You are looking at the files of a github repository and trying to identify their structure(which file is under which folder).
      Each file name provided below starts with \`source:\`.
      Give the proper structure of the repository by looking at the files.
      Here are the file names:
      ---
      ${context}
      ---
      Provide a structure of the repository, in proper markdown.`,
      ]);
      const text = response.response.text();
      return text;
  }
  catch(error){
    console.log("error getting repo structure: ", error);
  }
}

