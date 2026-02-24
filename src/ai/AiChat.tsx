import React, { JSX, useRef, useEffect, useState } from "react";
import { Box, Flex, Textarea, Input, createListCollection } from "@chakra-ui/react";
import { Button } from "../components/ui/button.tsx";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../components/ui/select.tsx";
import {
  AiProvider,
  AiConfig,
  AiMessage,
  PROVIDER_DEFAULTS,
  sendMessage,
} from "./aiClient.ts";
import { buildSystemPrompt, EXAMPLE_QA } from "./contextBuilder.ts";
import type { ResultArrayType } from "../sim/simulationArray.ts";
import type { DisplayDataType } from "../displayData.ts";

type Props = {
  netlist: string;
  pythonCode: string;
  editorMode: "spice" | "python";
  resultArray?: ResultArrayType;
  displayData?: DisplayDataType[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  isExample?: boolean;
};

const store = globalThis.localStorage;

export default function AiChat({
  netlist,
  pythonCode,
  editorMode,
  resultArray,
  displayData,
}: Props): JSX.Element {
  const [provider, setProvider] = useState<AiProvider>(
    () => (store.getItem("aiProvider") as AiProvider) || "openai"
  );
  const [model, setModel] = useState<string>(
    () =>
      store.getItem("aiModel") ||
      PROVIDER_DEFAULTS["openai"].defaultModel
  );
  const [apiKey, setApiKey] = useState<string>(
    () => store.getItem("aiApiKey") || ""
  );
  const [showKey, setShowKey] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Seed with example Q&A on first render
  useEffect(() => {
    if (messages.length === 0) {
      const examples: ChatMessage[] = [];
      EXAMPLE_QA.forEach((qa) => {
        examples.push({ role: "user", content: qa.question, isExample: true });
        examples.push({ role: "assistant", content: qa.answer, isExample: true });
      });
      setMessages(examples);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleProviderChange = (p: AiProvider) => {
    setProvider(p);
    store.setItem("aiProvider", p);
    const defaultModel = PROVIDER_DEFAULTS[p].defaultModel;
    setModel(defaultModel);
    store.setItem("aiModel", defaultModel);
  };

  const handleModelChange = (m: string) => {
    setModel(m);
    store.setItem("aiModel", m);
  };

  const handleApiKeyChange = (k: string) => {
    setApiKey(k);
    store.setItem("aiApiKey", k);
  };

  const handleSend = async (questionOverride?: string) => {
    const question = (questionOverride ?? input).trim();
    if (!question) return;
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        {
          role: "assistant",
          content: "Please enter your API key in the settings bar above.",
        },
      ]);
      setInput("");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt({
        netlist,
        pythonCode,
        resultArray,
        displayData,
        editorMode,
      });

      // Build conversation history (exclude example messages, include real ones)
      const history: AiMessage[] = messages
        .filter((m) => !m.isExample)
        .map((m) => ({ role: m.role, content: m.content }));

      const apiMessages: AiMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: question },
      ];

      const config: AiConfig = { provider, apiKey, model };
      const reply = await sendMessage(config, apiMessages);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Flex direction="column" height="100%" gap={2}>
      {/* Settings bar */}
      <Flex gap={2} align="center" flexWrap="wrap" p={2} bg="bg.muted" borderRadius="md">
        <SelectRoot
          size="sm"
          width="130px"
          collection={createListCollection({
            items: [
              { label: "OpenAI", value: "openai" },
              { label: "Anthropic", value: "anthropic" },
              { label: "Google", value: "google" },
            ],
          })}
          value={[provider]}
          onValueChange={(d) => handleProviderChange(d.value[0] as AiProvider)}
        >
          <SelectTrigger>
            <SelectValueText />
          </SelectTrigger>
          <SelectContent portalled={false}>
            {(["openai", "anthropic", "google"] as AiProvider[]).map((p) => (
              <SelectItem key={p} item={{ label: p, value: p }}>
                {{ openai: "OpenAI", anthropic: "Anthropic", google: "Google" }[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        <SelectRoot
          size="sm"
          width="190px"
          collection={createListCollection({
            items: PROVIDER_DEFAULTS[provider].models.map((m) => ({ label: m, value: m })),
          })}
          value={[model]}
          onValueChange={(d) => handleModelChange(d.value[0])}
        >
          <SelectTrigger>
            <SelectValueText />
          </SelectTrigger>
          <SelectContent portalled={false}>
            {PROVIDER_DEFAULTS[provider].models.map((m) => (
              <SelectItem key={m} item={{ label: m, value: m }}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        <Input
          size="sm"
          type={showKey ? "text" : "password"}
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          flex={1}
          minWidth="160px"
          fontFamily="monospace"
          fontSize="xs"
        />
        <Button size="sm" variant="ghost" onClick={() => setShowKey((s) => !s)}>
          {showKey ? "Hide" : "Show"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMessages([]);
            // Re-seed examples
            const examples: ChatMessage[] = [];
            EXAMPLE_QA.forEach((qa) => {
              examples.push({ role: "user", content: qa.question, isExample: true });
              examples.push({ role: "assistant", content: qa.answer, isExample: true });
            });
            setMessages(examples);
          }}
        >
          Clear
        </Button>
      </Flex>

      {/* Chat history */}
      <Box
        flex={1}
        overflowY="auto"
        p={3}
        display="flex"
        flexDirection="column"
        gap={3}
        minHeight="300px"
        maxHeight="500px"
      >
        {messages.map((msg, i) => (
          <Flex
            key={i}
            justify={msg.role === "user" ? "flex-end" : "flex-start"}
          >
            <Box
              maxWidth="85%"
              px={3}
              py={2}
              borderRadius="lg"
              fontSize="sm"
              bg={msg.role === "user" ? "blue.500" : msg.isExample ? "bg.subtle" : "bg.muted"}
              color={msg.role === "user" ? "white" : "fg"}
              opacity={msg.isExample ? 0.75 : 1}
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {msg.isExample && msg.role === "user" && (
                <Box fontSize="xs" color="fg.muted" mb={1}>Example question</Box>
              )}
              {msg.isExample && msg.role === "assistant" && (
                <Box fontSize="xs" color="fg.muted" mb={1}>Example answer (pre-computed)</Box>
              )}
              {msg.content}
            </Box>
          </Flex>
        ))}
        {isLoading && (
          <Flex justify="flex-start">
            <Box px={3} py={2} borderRadius="lg" bg="bg.muted" fontSize="sm" color="fg.muted">
              Thinking...
            </Box>
          </Flex>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Input area */}
      <Flex gap={2} p={2}>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your circuit... (Enter to send, Shift+Enter for newline)"
          rows={2}
          resize="none"
          fontSize="sm"
          flex={1}
        />
        <Button
          onClick={() => handleSend()}
          loading={isLoading}
          disabled={!input.trim()}
          colorScheme="blue"
          alignSelf="flex-end"
        >
          Send ▶
        </Button>
      </Flex>
    </Flex>
  );
}
