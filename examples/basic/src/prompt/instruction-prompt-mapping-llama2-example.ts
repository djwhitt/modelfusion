import {
  InstructionToLlama2PromptMapping,
  LlamaCppTextGenerationModel,
  streamText,
} from "modelfusion";

(async () => {
  const { textStream } = await streamText(
    new LlamaCppTextGenerationModel({
      contextWindowSize: 4096, // Llama 2 context window size
      nPredict: 512,
    }).mapPrompt(InstructionToLlama2PromptMapping()),
    {
      system: "You are a celebrated poet.",
      instruction: "Write a short story about a robot learning to love.",
    }
  );

  for await (const textFragment of textStream) {
    process.stdout.write(textFragment);
  }
})();