"use client";

import {
  useEffect,
  useState,
} from "react";

import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatArea from "@/components/ChatArea";
import Composer from "@/components/Composer";

import type {
  ChatMessage,
  ModelInfo,
} from "@/components/types";

import type { AISettings } from "@/lib/ai-settings-types.ts";

const STORAGE_KEY =
  "ai-router-messages";

const CONVERSATION_KEY =
  "ai-router-conversation-id";

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
        localStorage.getItem(
          STORAGE_KEY
        );

      if (savedMessages) {
        const parsed =
          JSON.parse(
            savedMessages
          );

        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }

      const savedConversationId =
        localStorage.getItem(
          CONVERSATION_KEY
        );

      if (savedConversationId) {
        setConversationId(
          savedConversationId
        );
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
    async function loadModels() {
      try {
        const response =
          await fetch("/api/models");

        if (!response.ok) {
          throw new Error(
            "Failed to load models"
          );
        }

        const data =
          await response.json();

        const loadedModels =
          Array.isArray(data)
            ? data
            : data.models ?? [];

        setModels(
          loadedModels
        );
      } catch (error) {
        console.error(
          "Model loading error:",
          error
        );
      }
    }

    loadModels();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD AI SETTINGS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadAISettings() {
      try {
        const response =
          await fetch(
            "/api/ai-settings"
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load AI settings"
          );
        }

        const data =
          await response.json();

        if (
          data.success &&
          data.settings
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
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  async function sendMessage() {
    const text =
      message.trim();

    if (
      !text ||
      loading
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE CONVERSATION ID
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

    const userMessage: ChatMessage =
      {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };

    /*
    |--------------------------------------------------------------------------
    | UPDATE UI IMMEDIATELY
    |--------------------------------------------------------------------------
    */

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );

    setMessage("");

    setLoading(true);

    setUsage(
      (value) => value + 1
    );

    try {
      /*
      |--------------------------------------------------------------------------
      | SEND TO API
      |--------------------------------------------------------------------------
      */

      const response =
        await fetch(
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

              model:
                selectedModel,

              messages: [
                ...messages,
                userMessage,
              ],
            }),
          }
        );

      /*
      |--------------------------------------------------------------------------
      | PARSE RESPONSE
      |--------------------------------------------------------------------------
      */

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "AI request failed"
        );
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE CONVERSATION ID
      |--------------------------------------------------------------------------
      */

      if (
        data.conversationId
      ) {
        setConversationId(
          data.conversationId
        );
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE ASSISTANT MESSAGE
      |--------------------------------------------------------------------------
      */

      const assistantMessage:
        ChatMessage = {
          id:
            crypto.randomUUID(),

          role:
            "assistant",

          content:
            data.response ??
            "AI tidak memberikan response.",

          model:
            data.model ??
            selectedModel,

          createdAt:
            Date.now(),
        };

      /*
      |--------------------------------------------------------------------------
      | ADD ASSISTANT MESSAGE
      |--------------------------------------------------------------------------
      */

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

      /*
      |--------------------------------------------------------------------------
      | REFRESH AI SETTINGS
      |--------------------------------------------------------------------------
      |
      | Ini berguna kalau nanti AI mengubah
      | nama dirinya sendiri.
      |
      */

      if (
        data.settings
      ) {
        setAISettings(
          data.settings
        );
      }
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

      const errorMessage:
        ChatMessage = {
          id:
            crypto.randomUUID(),

          role:
            "assistant",

          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Terjadi kesalahan.",

          createdAt:
            Date.now(),
        };

      setMessages(
        (previous) => [
          ...previous,
          errorMessage,
        ]
      );
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

    setConversationId(
      null
    );

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

      {/* DESKTOP SIDEBAR */}

      <Sidebar
        models={models}
        selectedModel={
          selectedModel
        }
        onModelChange={
          setSelectedModel
        }
        messages={messages}
        onNewChat={
          newChat
        }
        usage={usage}
        maxUsage={10}
      />

      {/* MOBILE SIDEBAR */}

      <MobileSidebar
        open={
          mobileSidebar
        }
        onClose={() =>
          setMobileSidebar(
            false
          )
        }
        models={models}
        selectedModel={
          selectedModel
        }
        onModelChange={
          setSelectedModel
        }
        messages={messages}
        onNewChat={
          newChat
        }
        usage={usage}
        maxUsage={10}
      />

      {/* MAIN */}

      <main className="main-content">

        <ChatHeader
          models={models}
          selectedModel={
            selectedModel
          }
          onModelChange={
            setSelectedModel
          }
          onOpenSidebar={() =>
            setMobileSidebar(
              true
            )
          }
        />

        <div className="chat-layout">

          <ChatArea
            messages={
              messages
            }
            loading={
              loading
            }
            selectedModel={
              selectedModel
            }
          />

          <Composer
            value={
              message
            }
            onChange={
              setMessage
            }
            onSend={
              sendMessage
            }
            loading={
              loading
            }
          />

        </div>

      </main>

    </div>
  );
}