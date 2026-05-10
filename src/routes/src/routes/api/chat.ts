import { createServerFn } from "@tanstack/start";

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

    // tijdelijke mock AI response
    return Response.json({
      message: `You said: ${message}`,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
