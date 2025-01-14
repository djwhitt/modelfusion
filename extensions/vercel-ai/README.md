# @modelfusion/vercel-ai

[ModelFusion](https://github.com/lgrammel/modelfusion) streams for the [Vercel AI SDK](https://github.com/vercel/ai).

## Usage

`ModelFusionTextStream(result: AsyncIterable<string>, callbacks?: AIStreamCallbacksAndOptions)`

You can call `ModelFusionTextStream` with the result from [streamText](https://modelfusion.dev/guide/function/generate-text#streamtext). This stream is compatible with the Vercel AI SDK and supports the callbacks and stream data features.

## Example: Ollama & Next.js

This is an example for a Next.js app router API route. It uses the ModelFusion [Ollama](https://github.com/jmorganca/ollama) integration. For a full example app, check out the [Next.js, Vercel AI SDK, Ollama & ModelFusion starter](https://github.com/lgrammel/modelfusion-ollama-nextjs-starter).

```ts
// app/api/chat/route.ts
import { Message, StreamingTextResponse } from "ai";
import { TextChatMessage, TextPrompt, ollama, streamText } from "modelfusion";
import { ModelFusionTextStream } from "@modelfusion/vercel-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  // Use ModelFusion to call Ollama:
  const textStream = await streamText(
    ollama
      .TextGenerator({
        model: "mistral:text",
        maxCompletionTokens: -1, // infinite generation
        temperature: 0,
        raw: true, // use raw inputs and map to prompt template below
      })
      .withPromptTemplate(TextPrompt.chat()), // Plain text prompt
    {
      system:
        "You are an AI chat bot. " +
        "Follow the user's instructions carefully.",

      // map Vercel AI SDK Message to ModelFusion TextChatMessage:
      messages: messages.filter(
        // only user and assistant roles are supported:
        (message) => message.role === "user" || message.role === "assistant"
      ) as TextChatMessage[],
    }
  );

  // Return the result using the Vercel AI SDK:
  return new StreamingTextResponse(
    // Convert the text stream to a Vercel AI SDK compatible stream:
    ModelFusionTextStream(
      textStream,
      // optional callbacks:
      {
        onStart() {
          console.log("onStart");
        },
        onToken(token) {
          console.log("onToken", token);
        },
        onCompletion: () => {
          console.log("onCompletion");
        },
        onFinal(completion) {
          console.log("onFinal", completion);
        },
      }
    )
  );
}
```
