import { sql } from "@/lib/db";

type MessageRole =
  | "user"
  | "assistant";

interface SaveMessageParams {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model?: string;
}

export async function ensureConversation(
  conversationId: string
) {
  const existing =
    await sql`
      SELECT id
      FROM conversations
      WHERE id = ${conversationId}
      LIMIT 1
    `;

  if (existing.length > 0) {
    return existing[0];
  }

  const created =
    await sql`
      INSERT INTO conversations (
        id,
        title
      )
      VALUES (
        ${conversationId},
        'New Chat'
      )
      RETURNING *
    `;

  return created[0];
}

export async function saveMessage({
  id,
  conversationId,
  role,
  content,
  model,
}: SaveMessageParams) {
  const result =
    await sql`
      INSERT INTO messages (
        id,
        conversation_id,
        role,
        content,
        model
      )
      VALUES (
        ${id},
        ${conversationId},
        ${role},
        ${content},
        ${model ?? null}
      )
      RETURNING *
    `;

  return result[0];
}

export async function getConversationMessages(
  conversationId: string
) {
  const result =
    await sql`
      SELECT
        id,
        role,
        content,
        model,
        created_at
      FROM messages
      WHERE conversation_id =
        ${conversationId}
      ORDER BY created_at ASC
    `;

  return result;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
) {
  await sql`
    UPDATE conversations
    SET
      title = ${title},
      updated_at = NOW()
    WHERE id = ${conversationId}
  `;
}

export async function updateConversationTimestamp(
  conversationId: string
) {
  await sql`
    UPDATE conversations
    SET
      updated_at = NOW()
    WHERE id = ${conversationId}
  `;
}