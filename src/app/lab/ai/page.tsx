import { Suspense } from "react";
import { ChatClient } from "../chat/chat-client";

export default function AiPage() {
  return (
    <Suspense fallback={null}>
      <ChatClient />
    </Suspense>
  );
}
