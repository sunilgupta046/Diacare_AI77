import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Mic, MicOff, Send, X } from "lucide-react";
import { sendChatMessage } from "../api";

const starterQuestions = ["What is HbA1c?", "How do I log a reading?", "What should I eat?"];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "Hi, I'm DiaCare Assistant. Ask about any topic or get help using DiaCare." },
  ]);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported by this browser. You can type your question instead.");
      return;
    }

    setVoiceError("");
    const recognition = new SpeechRecognition();
    recognition.lang = window.navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      setDraft((current) => [current.trim(), transcript].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      setVoiceError(event.error === "not-allowed"
        ? "Microphone permission was denied. Allow microphone access or type your question."
        : "Voice input could not start. Please try again or type your question.");
    };
    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError("Voice input could not start. Please try again or type your question.");
    }
  };

  const sendMessage = async (message = draft) => {
    const question = message.trim();
    if (!question || isSending) return;

    setMessages((current) => {
      const nextId = `${Date.now()}-${current.length}`;
      return [...current, { id: `${nextId}-user`, role: "user", text: question }];
    });
    setDraft("");

    const conversation = [
      ...messages
        .filter((item) => item.id !== "welcome")
        .map(({ role, text }) => ({ role, content: text })),
      { role: "user", content: question },
    ].slice(-12);

    setIsSending(true);
    try {
      const response = await sendChatMessage(conversation);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant-${current.length}`, role: "assistant", text: response.reply },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error-${current.length}`,
          role: "assistant",
          text: error.message || "The assistant is unavailable. Check the backend configuration and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Close DiaCare chat" : "Open DiaCare chat"}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <MessageCircle size={16} />
        <span>Ask DiaCare</span>
      </button>

      {isOpen && (
        <section
          aria-label="DiaCare Assistant chat"
          className="fixed bottom-5 right-4 z-50 flex h-[min(560px,calc(100vh-2.5rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:right-6"
        >
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Bot size={17} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">DiaCare Assistant</div>
                <div className="text-[11px] text-slate-500">General AI assistant</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200"
            >
              <X size={17} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                  {message.text}
                </p>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {starterQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    disabled={isSending}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            {isSending && <p className="text-xs text-slate-400" role="status">Thinking…</p>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 px-3 py-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={isSending}
                aria-label="Ask DiaCare Assistant"
                placeholder="Ask a question about any topic..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isSending}
                aria-label={isListening ? "Stop voice input" : "Use voice input"}
                aria-pressed={isListening}
                title={isListening ? "Stop voice input" : "Use voice input"}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isListening ? "bg-red-100 text-red-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {isListening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>
              <button
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim() || isSending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
            {isListening && <p className="mt-2 text-xs text-blue-700" role="status">Listening… speak your question.</p>}
            {voiceError && <p className="mt-2 text-xs text-red-600" role="status">{voiceError}</p>}
            <p className="mt-2 text-[10px] leading-snug text-slate-400">Messages are sent to OpenAI. Avoid identifying or sensitive health details. Not for diagnosis, emergencies, or medication dosing.</p>
          </div>
        </section>
      )}
    </>
  );
}