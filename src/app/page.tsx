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
  /*
  |--------------------------------------------------------------------------
  | CHAT STATE
  |--------------------------------------------------------------------------
  */

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [conversationId, setConversationId] =
    useState<string>("");

  /*
  |--------------------------------------------------------------------------
  | MODEL STATE
  |--------------------------------------------------------------------------
  */

  const [models, setModels] =
    useState<ModelInfo[]>([]);

  const [selectedModel, setSelectedModel] =
    useState("openrouter/free");

  /*
  |--------------------------------------------------------------------------
  | UI STATE
  |--------------------------------------------------------------------------
  */

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
  | INITIALIZE CONVERSATION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      let savedConversationId =
        localStorage.getItem(
          CONVERSATION_KEY
        );

      /*
      |--------------------------------------------------------------
      | Create conversation ID if none exists
      |--------------------------------------------------------------
      */

      if (!savedConversationId) {
        savedConversationId =
          crypto.randomUUID();

        localStorage.setItem(
          CONVERSATION_KEY,
          savedConversationId
        );
      }

      setConversationId(
        savedConversationId
      );
    } catch (error) {
      console.error(
        "Failed to initialize conversation:",
        error
      );

      /*
      |--------------------------------------------------------------
      | Fallback
      |--------------------------------------------------------------
      */

      setConversationId(
        crypto.randomUUID()
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD LOCAL CHAT HISTORY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!saved) {
        return;
      }

      const parsed =
        JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch (error) {
      console.error(
        "Failed to load history:",
        error
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SAVE LOCAL CHAT HISTORY
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
        "Failed to save history:",
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
      loading ||
      !conversationId
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------
    | User message
    |--------------------------------------------------------------
    */

    const userMessage:
      ChatMessage = {
      id: crypto.randomUUID(),

      role: "user",

      content: text,

      createdAt: Date.now(),
    };

    /*
    |--------------------------------------------------------------
    | Conversation sent to API
    |--------------------------------------------------------------
    */

    const conversation = [
      ...messages,
      userMessage,
    ];

    /*
    |--------------------------------------------------------------
    | Update UI immediately
    |--------------------------------------------------------------
    */

    setMessages(
      conversation
    );

    setMessage("");

    setLoading(true);

    setUsage(
      (value) => value + 1
    );

    /*
    |--------------------------------------------------------------
    | Create empty assistant message
    |--------------------------------------------------------------
    */

    const assistantId =
      crypto.randomUUID();

    const initialAssistantMessage:
      ChatMessage = {
      id: assistantId,

      role: "assistant",

      content: "",

      model:
        selectedModel,

      createdAt: Date.now(),
    };

    setMessages(
      (previous) => [
        ...previous,
        initialAssistantMessage,
      ]
    );

    try {
      /*
      |--------------------------------------------------------------
      | Send request
      |--------------------------------------------------------------
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

                messages:
                  conversation,

                model:
                  selectedModel,
              }),
          }
        );

      /*
      |--------------------------------------------------------------
      | Error handling
      |--------------------------------------------------------------
      */

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
      |--------------------------------------------------------------
      | Check stream
      |--------------------------------------------------------------
      */

      if (!response.body) {
        throw new Error(
          "AI tidak mengembalikan stream."
        );
      }

      /*
      |--------------------------------------------------------------
      | Read stream
      |--------------------------------------------------------------
      */

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let accumulated =
        "";

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

        accumulated +=
          chunk;

        /*
        |----------------------------------------------------------
        | Update assistant message
        |----------------------------------------------------------
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
                        accumulated,
                    }
                  : msg
            )
        );
      }

      /*
      |--------------------------------------------------------------
      | Final response
      |--------------------------------------------------------------
      */

      const finalContent =
        accumulated.trim();

      if (!finalContent) {
        throw new Error(
          "AI tidak memberikan response."
        );
      }

      /*
      |--------------------------------------------------------------
      | Finalize assistant message
      |--------------------------------------------------------------
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
                      finalContent,
                  }
                : msg
          )
      );
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      /*
      |--------------------------------------------------------------
      | Show error inside assistant message
      |--------------------------------------------------------------
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
                      error instanceof
                      Error
                        ? `Error: ${error.message}`
                        : "Terjadi kesalahan.",
                  }
                : msg
          )
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

    /*
    |--------------------------------------------------------------
    | Generate new conversation ID
    |--------------------------------------------------------------
    */

    const newConversationId =
      crypto.randomUUID();

    /*
    |--------------------------------------------------------------
    | Reset UI
    |--------------------------------------------------------------
    */

    setMessages([]);

    setMessage("");

    setConversationId(
      newConversationId
    );

    /*
    |--------------------------------------------------------------
    | Save new conversation ID
    |--------------------------------------------------------------
    */

    try {
      localStorage.setItem(
        CONVERSATION_KEY,
        newConversationId
      );

      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch (error) {
      console.error(
        "Failed to reset conversation:",
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
      {/* =========================================================
          DESKTOP SIDEBAR
          ========================================================= */}

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

      {/* =========================================================
          MOBILE SIDEBAR
          ========================================================= */}

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

      {/* =========================================================
          MAIN CONTENT
          ========================================================= */}

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