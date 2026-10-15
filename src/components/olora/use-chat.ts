"use client";

import { useCallback, useState } from "react";
import { useLabAuth } from "@/lib/lab/auth";
import { sendChat } from "@/lib/lab/inference-chat";
import { estimateCost } from "@/lib/lab/inference-catalog";
import { pushActivity } from "@/lib/lab/projects";
import { saveConversation, type Conversation, type StoredMessage } from "@/lib/olora/hooks";
import type { OloraModel } from "@/lib/olora/models";

function uid(p: string) {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function friendlyError(raw: string): string {
  if (/sign in|unauthori|401/i.test(raw)) return "Sign in to start chatting.";
  if (/insufficient|balance|credit|402/i.test(raw)) return "You're out of credits. Add credits to keep chatting.";
  return raw || "Something went wrong. Please try again.";
}

export function useChat(initial?: Conversation) {
  const { getAccessToken, authenticated, requireAuth } = useLabAuth();
  const [conv, setConv] = useState<Conversation | null>(initial ?? null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => setConv(null), []);
  const load = useCallback((c: Conversation) => setConv(c), []);

  /** Send to one or more models. With two models, both answer the same prompt (compare). */
  const send = useCallback(
    async (text: string, models: OloraModel[]) => {
      const prompt = text.trim();
      if (!prompt || busy || !models.length) return;
      if (!authenticated) {
        requireAuth("/lab/chat");
        return;
      }

      const base: Conversation = conv ?? {
        id: uid("c"),
        title: prompt.slice(0, 60),
        model: models[0].id,
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      const userMsg: StoredMessage = { id: uid("u"), role: "user", content: prompt };
      const withUser = { ...base, messages: [...base.messages, userMsg], updatedAt: new Date().toISOString() };
      setConv(withUser);
      setBusy(true);

      // History for the primary thread: user turns + the first model's replies.
      const history = withUser.messages
        .filter((m) => m.role === "user" || m.model === models[0].id || !m.model)
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const replies = await Promise.all(
        models.map(async (model): Promise<StoredMessage> => {
          const res = await sendChat({ model: model.id, messages: history, getAccessToken });
          if (res.error) {
            return { id: uid("a"), role: "assistant", content: friendlyError(res.error), model: model.id, error: true };
          }
          const cost =
            typeof res.usage?.cost === "number"
              ? res.usage.cost
              : estimateCost(model.inputPerM, model.outputPerM, res.usage?.prompt_tokens, res.usage?.completion_tokens);
          pushActivity({
            kind: "inference",
            title: `${model.name} · chat`,
            amount: cost != null ? `−$${cost.toFixed(4)}` : undefined,
            resource: model.name,
            provider: model.provider,
            status: "ok",
          });
          return {
            id: uid("a"),
            role: "assistant",
            content: res.content,
            model: model.id,
            cost,
            included: res.usage?.included === true,
          };
        }),
      );

      const done: Conversation = {
        ...withUser,
        model: models[0].id,
        messages: [...withUser.messages, ...replies],
        updatedAt: new Date().toISOString(),
      };
      setConv(done);
      saveConversation(done);
      setBusy(false);
    },
    [authenticated, busy, conv, getAccessToken, requireAuth],
  );

  return { conv, busy, send, reset, load };
}
