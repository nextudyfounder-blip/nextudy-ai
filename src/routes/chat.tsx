import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("Auth error:", authError);
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Message load error:", error);
          setMessages([]);
          return;
        }

        setMessages(data || []);
      } catch (err) {
        console.error("Init error:", err);
        setMessages([]);
      }
    };

    init();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!userId) {
      alert("You must be logged in.");
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...(prev || []), userMessage]);

    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      await supabase.from("messages").insert({
        user_id: userId,
        role: "user",
        content: currentInput,
      });

     const data = {
  message: `You said: ${currentInput}`,
};
      const aiMessage: Message = {
        role: "assistant",
        content:
          data?.message ||
          "Sorry, something went wrong with the AI response.",
      };

      setMessages((prev) => [...(prev || []), aiMessage]);

      await supabase.from("messages").insert({
        user_id: userId,
        role: "assistant",
        content: aiMessage.content,
      });
    } catch (err) {
      console.error("Send message error:", err);

      setMessages((prev) => [
        ...(prev || []),
        {
          role: "assistant",
          content: "An error occurred while contacting the AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {(messages || []).map((msg, index) => (
          <div
            key={msg.id || index}
            className={`p-3 rounded-xl max-w-[80%] ${
              msg.role === "user"
                ? "bg-blue-600 ml-auto"
                : "bg-gray-800"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="bg-gray-800 p-3 rounded-xl w-fit">
            Thinking...
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 p-3 rounded-xl bg-gray-900 border border-gray-700"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 px-4 py-2 rounded-xl"
        >
          Send
        </button>
      </div>
    </div>
  );
}
