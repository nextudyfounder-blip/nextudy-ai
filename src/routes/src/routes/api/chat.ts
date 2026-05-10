import { createServerFn } from "@tanstack/start";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const Server = createServerFn("POST", async ({ data }) => {
  try {
    const body =
      typeof data === "string"
        ? JSON.parse(data)
        : data;

    const message = body?.message;

    if (!message) {
      return Response.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI tutor for students.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "No response generated.";

    return Response.json({
      message: reply,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
