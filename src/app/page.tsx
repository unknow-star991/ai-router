"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatArea from "@/components/ChatArea";
import Composer from "@/components/Composer";

import type {
  ChatMessage,
  ModelInfo,
} from "@/components/types";

import type {
  AISettings,
} from "@/lib/ai-settings-types";

const STORAGE_KEY = "ai-router-messages";
const CONVERSATION_KEY = "ai-router-conversation-id";

const MAX_FREE_USAGE = 10;

export default function Home() {
  /*
  |--------------------------------------------------------------------------
  | CHAT STATE
  |--------------------------------------------------------------------------
  */

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [conversationId, setConversationId] =
    useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | MODEL STATE
  |--------------------------------------------------------------------------
  */

  const [models, setModels] =
    useState<ModelInfo[]>([]);

  const [selectedModel, setSelectedModel] =
    useState("auto");

  /*
  |--------------------------------------------------------------------------
  | UI STATE
  |--------------------------------------------------------------------------
  */

  const [mobileSidebar, setMobileSidebar] =
    useState(false);

  const [usage, setUsage] =
    useState(0);

  /*
  |--------------------------------------------------------------------------
  | AI SETTINGS
  |--------------------------------------------------------------------------
  |
  | Tetap dipertahankan karena sistem AI bisa mengubah
  | konfigurasi seperti nama AI melalui /api/ai-settings.
  |
  | Data ini tidak dikirim ke komponen UI karena komponen
  | tersebut belum membutuhkan prop aiSettings.
  |
  */

  const [aiSettings, setAISettings] =
    useState<AISettings | null>(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD LOCAL CHAT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      const savedMessages =
        localStorage.getItem(STORAGE_KEY);

      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);

        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }

      const savedConversationId =
        localStorage.getItem(CONVERSATION_KEY);

      if (savedConversationId) {
        setConversationId(savedConversationId);
      }
    } catch (error) {
      console.error(
        "Failed to load local chat:",
        error
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SAVE LOCAL CHAT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error(
        "Failed to save messages:",
        error
      );
    }
  }, [messages]);

  /*
  |--------------------------------------------------------------------------
  | SAVE CONVERSATION ID
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem(
          CONVERSATION_KEY,
          conversationId
        );
      } else {
        localStorage.removeItem(
          CONVERSATION_KEY
        );
      }
    } catch (error) {
      console.error(
        "Failed to save conversation ID:",
        error
      );
    }
  }, [conversationId]);

  /*
  |--------------------------------------------------------------------------
  | LOAD MODELS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      try {
        const response = await fetch(
          "/api/models",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load models: ${response.status}`
          );
        }

        const data =
          await response.json();

        const loadedModels =
          Array.isArray(data)
            ? data
            : Array.isArray(data.models)
              ? data.models
              : [];

        if (mounted) {
          setModels(loadedModels);
        }
      } catch (error) {
        console.error(
          "Model loading error:",
          error
        );
      }
    }

    loadModels();

    return () => {
      mounted = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD AI SETTINGS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    async function loadAISettings() {
      try {
        const response = await fetch(
          "/api/ai-settings",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load AI settings: ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          mounted &&
          data?.success &&
          data?.settings
        ) {
          setAISettings(
            data.settings
          );
        }
      } catch (error) {
        console.error(
          "AI settings loading error:",
          error
        );
      }
    }

    loadAISettings();

    return () => {
      mounted = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | REFRESH AI SETTINGS
  |--------------------------------------------------------------------------
  */

  async function refreshAISettings() {
    try {
      const response = await fetch(
        "/api/ai-settings",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (
        data?.success &&
        data?.settings
      ) {
        setAISettings(
          data.settings
        );
      }
    } catch (error) {
      console.error(
        "Failed to refresh AI settings:",
        error
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  async function sendMessage() {
    const text = message.trim();

    if (!text || loading) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE CONVERSATION
    |--------------------------------------------------------------------------
    */

    const activeConversationId =
      conversationId ??
      crypto.randomUUID();

    if (!conversationId) {
      setConversationId(
        activeConversationId
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE USER MESSAGE
    |--------------------------------------------------------------------------
    */

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    /*
    |--------------------------------------------------------------------------
    | UPDATE UI
    |--------------------------------------------------------------------------
    */

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setMessage("");
    setLoading(true);

    setUsage((value) =>
      Math.min(
        MAX_FREE_USAGE,
        value + 1
      )
    );

    try {
      /*
      |--------------------------------------------------------------------------
      | REQUEST API
      |--------------------------------------------------------------------------
      */

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            conversationId:
              activeConversationId,

            message: text,

            model: selectedModel,

            messages: [
              ...messages,
              userMessage,
            ],
          }),
        }
      );

      /*
      |--------------------------------------------------------------------------
      | READ RESPONSE
      |--------------------------------------------------------------------------
      |
      | API saat ini mengembalikan plain text.
      |
      */

      const responseText =
        await response.text();

      /*
      |--------------------------------------------------------------------------
      | HANDLE API ERROR
      |--------------------------------------------------------------------------
      */

      if (!response.ok) {
        let errorMessage =
          "AI request failed.";

        try {
          const errorData =
            JSON.parse(
              responseText
            );

          errorMessage =
            errorData?.error ??
            errorData?.message ??
            errorMessage;
        } catch {
          if (
            responseText.trim()
          ) {
            errorMessage =
              responseText;
          }
        }

        throw new Error(
          errorMessage
        );
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE ASSISTANT MESSAGE
      |--------------------------------------------------------------------------
      */

      const assistantMessage:
        ChatMessage = {
          id: crypto.randomUUID(),

          role: "assistant",

          content:
            responseText ||
            "AI tidak memberikan response.",

          model:
            selectedModel,

          createdAt: Date.now(),
        };

      /*
      |--------------------------------------------------------------------------
      | UPDATE MESSAGE LIST
      |--------------------------------------------------------------------------
      */

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      /*
      |--------------------------------------------------------------------------
      | REFRESH AI SETTINGS
      |--------------------------------------------------------------------------
      |
      | Jika AI mengubah nama/configuration melalui
      | tool atau backend, UI mengambil data terbaru.
      |
      */

      await refreshAISettings();
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      /*
      |--------------------------------------------------------------------------
      | ERROR MESSAGE
      |--------------------------------------------------------------------------
      */

      const errorText =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghubungi AI.";

      const errorMessage:
        ChatMessage = {
          id: crypto.randomUUID(),

          role: "assistant",

          content:
            `Error: ${errorText}`,

          createdAt: Date.now(),
        };

      setMessages((previous) => [
        ...previous,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | NEW CHAT
  |--------------------------------------------------------------------------
  */

  function newChat() {
    if (loading) {
      return;
    }

    setMessages([]);
    setMessage("");
    setConversationId(null);
    setUsage(0);

    try {
      localStorage.removeItem(
        STORAGE_KEY
      );

      localStorage.removeItem(
        CONVERSATION_KEY
      );
    } catch (error) {
      console.error(
        "Failed to clear local chat:",
        error
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="app-shell">

      {/* ================================================================
          DESKTOP SIDEBAR
      ================================================================ */}
<Sidebar
  models={models}
  selectedModel={selectedModel}
  onModelChange={setSelectedModel}
  messages={messages}
  onNewChat={newChat}
  usage={usage}
  maxUsage={MAX_FREE_USAGE}
  aiSettings={aiSettings}
/>

      {/* ================================================================
          MOBILE SIDEBAR
      ================================================================ */}

      <MobileSidebar
  open={mobileSidebar}
  onClose={() => setMobileSidebar(false)}
  models={models}
  selectedModel={selectedModel}
  onModelChange={setSelectedModel}
  messages={messages}
  onNewChat={newChat}
  usage={usage}
  maxUsage={MAX_FREE_USAGE}
  aiSettings={aiSettings}
/>

      {/* ================================================================
          MAIN CONTENT
      ================================================================ */}

      <main className="main-content">

        {/* ============================================================
            HEADER
        ============================================================ */}

        <ChatHeader
          models={models}

          selectedModel={
            selectedModel
          }

          onModelChange={
            setSelectedModel
          }

          onOpenSidebar={() =>
            setMobileSidebar(true)
          }
        />

        {/* ============================================================
            CHAT LAYOUT
        ============================================================ */}

        <div className="chat-layout">

          {/* ==========================================================
              CHAT AREA
          ========================================================== */}

          <ChatArea
            messages={messages}

            loading={loading}

            selectedModel={
              selectedModel
            }
          />

          {/* ==========================================================
              COMPOSER
          ========================================================== */}

          <Composer
            value={message}

            onChange={
              setMessage
            }

            onSend={
              sendMessage
            }

            loading={loading}
          />

        </div>
      </main>
    </div>
  );
}