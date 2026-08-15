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

const STORAGE_KEY =
  "ai-router-messages";

const CONVERSATION_KEY =
  "ai-router-conversation-id";

export default function Home() {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [conversationId, setConversationId] =
    useState<string | null>(null);

  const [models, setModels] =
    useState<ModelInfo[]>([]);

  const [selectedModel, setSelectedModel] =
    useState("auto");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [mobileSidebar, setMobileSidebar] =
    useState(false);

  const [usage, setUsage] =
    useState(0);

  /*
  |--------------------------------------------------------------------------
  | LOAD CHAT
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
          JSON.parse(savedMessages);

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
      } else {
        const newConversationId =
          crypto.randomUUID();

        localStorage.setItem(
          CONVERSATION_KEY,
          newConversationId
        );

        setConversationId(
          newConversationId
        );
      }
    } catch (error) {
      console.error(
        "Failed to load chat:",
        error
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SAVE UI HISTORY
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

    if (!conversationId) {
      console.error(
        "Conversation ID belum tersedia."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | USER MESSAGE
    |--------------------------------------------------------------------------
    */

    const userMessage:
      ChatMessage = {
        id:
          crypto.randomUUID(),

        role: "user",

        content: text,

        createdAt:
          Date.now(),
      };

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

            body:
              JSON.stringify({
                conversationId,

                message: text,

                model:
                  selectedModel,
              }),
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          data?.error ??
            "AI request failed"
        );
      }

      /*
      |--------------------------------------------------------------------------
      | READ STREAM
      |--------------------------------------------------------------------------
      */

      if (!response.body) {
        throw new Error(
          "AI tidak mengembalikan stream."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      const assistantId =
        crypto.randomUUID();

      let fullResponse =
        "";

      /*
      |--------------------------------------------------------------------------
      | CREATE EMPTY ASSISTANT MESSAGE
      |--------------------------------------------------------------------------
      */

      setMessages(
        (previous) => [
          ...previous,
          {
            id:
              assistantId,

            role:
              "assistant",

            content: "",

            model:
              selectedModel,

            createdAt:
              Date.now(),
          },
        ]
      );

      /*
      |--------------------------------------------------------------------------
      | STREAM LOOP
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

        fullResponse +=
          chunk;

        /*
        |--------------------------------------------------------------------------
        | UPDATE ASSISTANT MESSAGE
        |--------------------------------------------------------------------------
        */

        setMessages(
          (previous) =>
            previous.map(
              (msg) =>
                msg.id ===
                assistantId
                  ? {
                      ...msg,

                      content:
                        fullResponse,
                    }
                  : msg
            )
        );
      }

      /*
      |--------------------------------------------------------------------------
      | FINAL UPDATE
      |--------------------------------------------------------------------------
      */

      setMessages(
        (previous) =>
          previous.map(
            (msg) =>
              msg.id ===
              assistantId
                ? {
                    ...msg,

                    content:
                      fullResponse,
                  }
                : msg
          )
      );
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      setMessages(
        (previous) => [
          ...previous,
          {
            id:
              crypto.randomUUID(),

            role:
              "assistant",

            content:
              error instanceof
              Error
                ? `Error: ${error.message}`
                : "Terjadi kesalahan.",

            createdAt:
              Date.now(),
          },
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

    const newConversationId =
      crypto.randomUUID();

    setMessages([]);

    setMessage("");

    setConversationId(
      newConversationId
    );

    localStorage.removeItem(
      STORAGE_KEY
    );

    localStorage.setItem(
      CONVERSATION_KEY,
      newConversationId
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="app-shell">
      <Sidebar
        models={models}
        selectedModel={
          selectedModel
        }
        onModelChange={
          setSelectedModel
        }
        messages={messages}
        onNewChat={newChat}
        usage={usage}
        maxUsage={10}
      />

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
        onNewChat={newChat}
        usage={usage}
        maxUsage={10}
      />

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
            messages={messages}
            loading={loading}
            selectedModel={
              selectedModel
            }
          />

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