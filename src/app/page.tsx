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

import type { AISettings } from "@/lib/ai-settings-types";

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

    const userMessage:
      ChatMessage = {
        id:
          crypto.randomUUID(),

        role:
          "user",

        content:
          text,

        createdAt:
          Date.now(),
      };

    /*
    |--------------------------------------------------------------------------
    | ADD USER MESSAGE
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
      (value) =>
        value + 1
    );

    try {
      /*
      |--------------------------------------------------------------------------
      | API REQUEST
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

              message:
                text,

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
      | RESPONSE TYPE
      |--------------------------------------------------------------------------
      */

      const contentType =
        response.headers.get(
          "content-type"
        ) ?? "";

      /*
      |--------------------------------------------------------------------------
      | JSON RESPONSE
      |
      | Digunakan untuk AI ACTION
      |--------------------------------------------------------------------------
      */

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              data.message ??
              "AI request failed."
          );
        }

        /*
        | Update conversation ID
        */

        if (
          data.conversationId
        ) {
          setConversationId(
            data.conversationId
          );
        }

        /*
        | Update AI settings
        */

        if (
          data.settings
        ) {
          setAISettings(
            data.settings
          );
        }

        /*
        | Create assistant response
        */

        const assistantMessage:
          ChatMessage = {
            id:
              crypto.randomUUID(),

            role:
              "assistant",

            content:
              data.response ??
              "Aksi berhasil dijalankan.",

            model:
              data.model ??
              selectedModel,

            createdAt:
              Date.now(),
          };

        setMessages(
          (previous) => [
            ...previous,
            assistantMessage,
          ]
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | NORMAL STREAMING RESPONSE
      |
      | Digunakan untuk chat biasa
      |--------------------------------------------------------------------------
      */

      if (!response.ok) {
        let errorMessage =
          "AI request failed.";

        try {
          const errorText =
            await response.text();

          if (
            errorText.trim()
          ) {
            errorMessage =
              errorText;
          }
        } catch {
          // Ignore response parsing error
        }

        throw new Error(
          errorMessage
        );
      }

      /*
      |--------------------------------------------------------------------------
      | CONVERSATION ID FROM HEADER
      |--------------------------------------------------------------------------
      */

      const returnedConversationId =
        response.headers.get(
          "X-Conversation-Id"
        );

      if (
        returnedConversationId
      ) {
        setConversationId(
          returnedConversationId
        );
      }

      /*
      |--------------------------------------------------------------------------
      | MODEL FROM HEADER
      |--------------------------------------------------------------------------
      */

      const returnedModel =
        response.headers.get(
          "X-Model"
        );

      /*
      |--------------------------------------------------------------------------
      | STREAM READER
      |--------------------------------------------------------------------------
      */

      const reader =
        response.body?.getReader();

      if (!reader) {
        throw new Error(
          "Response stream tidak tersedia."
        );
      }

      const decoder =
        new TextDecoder();

      let assistantContent =
        "";

      const assistantMessageId =
        crypto.randomUUID();

      /*
      |--------------------------------------------------------------------------
      | CREATE EMPTY ASSISTANT MESSAGE
      |--------------------------------------------------------------------------
      */

      const assistantMessage:
        ChatMessage = {
          id:
            assistantMessageId,

          role:
            "assistant",

          content:
            "",

          model:
            returnedModel ??
            selectedModel,

          createdAt:
            Date.now(),
        };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

      /*
      |--------------------------------------------------------------------------
      | READ STREAM
      |--------------------------------------------------------------------------
      */

      while (true) {
        const {
          done,
          value,
        } =
          await reader.read();

        if (done) {
          break;
        }

        const chunk =
          decoder.decode(
            value,
            {
              stream: true,
            }
          );

        if (!chunk) {
          continue;
        }

        assistantContent +=
          chunk;

        /*
        | Update assistant
        | message realtime
        */

        setMessages(
          (previous) =>
            previous.map(
              (currentMessage) =>
                currentMessage.id ===
                assistantMessageId
                  ? {
                      ...currentMessage,

                      content:
                        assistantContent,
                    }
                  : currentMessage
            )
        );
      }

      /*
      |--------------------------------------------------------------------------
      | FLUSH DECODER
      |--------------------------------------------------------------------------
      */

      const finalChunk =
        decoder.decode();

      if (finalChunk) {
        assistantContent +=
          finalChunk;

        setMessages(
          (previous) =>
            previous.map(
              (currentMessage) =>
                currentMessage.id ===
                assistantMessageId
                  ? {
                      ...currentMessage,

                      content:
                        assistantContent,
                    }
                  : currentMessage
            )
        );
      }

      /*
      |--------------------------------------------------------------------------
      | EMPTY RESPONSE FALLBACK
      |--------------------------------------------------------------------------
      */

      if (
        !assistantContent.trim()
      ) {
        setMessages(
          (previous) =>
            previous.map(
              (currentMessage) =>
                currentMessage.id ===
                assistantMessageId
                  ? {
                      ...currentMessage,

                      content:
                        "AI tidak memberikan response.",
                    }
                  : currentMessage
            )
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
        models={
          models
        }

        selectedModel={
          selectedModel
        }

        onModelChange={
          setSelectedModel
        }

        messages={
          messages
        }

        onNewChat={
          newChat
        }

        usage={
          usage
        }

        maxUsage={
          10
        }
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

        models={
          models
        }

        selectedModel={
          selectedModel
        }

        onModelChange={
          setSelectedModel
        }

        messages={
          messages
        }

        onNewChat={
          newChat
        }

        usage={
          usage
        }

        maxUsage={
          10
        }
      />

      {/* MAIN */}

      <main className="main-content">

        <ChatHeader
          models={
            models
          }

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