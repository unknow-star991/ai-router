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

export default function Home() {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

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

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (saved) {
        const parsed = JSON.parse(
          saved
        );

        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {
      console.error(
        "Failed to load history"
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages)
    );
  }, [messages]);

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

        setModels(loadedModels);
      } catch (error) {
        console.error(
          "Model loading error:",
          error
        );
      }
    }

    loadModels();
  }, []);

  async function sendMessage() {
    const text = message.trim();

    if (!text || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setMessage("");
    setLoading(true);
    setUsage((value) => value + 1);

    try {
      const response =
        await fetch("/api/chat", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: text,
            model: selectedModel,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "AI request failed"
        );
      }

      const assistantMessage: ChatMessage =
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            data.response ??
            "AI tidak memberikan response.",
          model:
            data.model ??
            selectedModel,
          createdAt: Date.now(),
        };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(error);

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Terjadi kesalahan.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    if (loading) return;

    setMessages([]);
    setMessage("");

    localStorage.removeItem(
      STORAGE_KEY
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        models={models}
        selectedModel={selectedModel}
        onModelChange={
          setSelectedModel
        }
        messages={messages}
        onNewChat={newChat}
        usage={usage}
        maxUsage={10}
      />

      <MobileSidebar
        open={mobileSidebar}
        onClose={() =>
          setMobileSidebar(false)
        }
        models={models}
        selectedModel={selectedModel}
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
          selectedModel={selectedModel}
          onModelChange={
            setSelectedModel
          }
          onOpenSidebar={() =>
            setMobileSidebar(true)
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
            onChange={setMessage}
            onSend={sendMessage}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}