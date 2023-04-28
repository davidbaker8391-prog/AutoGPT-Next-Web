import type { ReactNode } from "react";
import React, { useEffect, useRef, useState } from "react";
import {
  FaBrain,
  FaClipboard,
  FaCopy,
  FaImage,
  FaListAlt,
  FaPlayCircle,
  FaSave,
  FaStar,
} from "react-icons/fa";
import PopIn from "./motions/popin";
import Expand from "./motions/expand";
import * as htmlToImage from "html-to-image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import Button from "./Button";
import { useTranslation, Trans } from "next-i18next";

import WindowButton from "./WindowButton";
import PDFButton from "./pdf/PDFButton";
import FadeIn from "./motions/FadeIn";
import Menu from "./Menu";
import type { Message } from "../types/agentTypes";
import clsx from "clsx";

interface ChatWindowProps extends HeaderProps {
  children?: ReactNode;
  className?: string;
  showDonation: boolean;
  fullscreen?: boolean;
  scrollToBottom?: boolean;
  showWeChatPay?: () => void;
}

const messageListId = "chat-window-message-list";

const ChatWindow = ({
  messages,
  children,
  className,
  title,
  showDonation,
  onSave,
  fullscreen,
  scrollToBottom,
  showWeChatPay,
}: ChatWindowProps) => {
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation(["chat", "common"]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    // Use has scrolled if we have scrolled up at all from the bottom
    const hasUserScrolled = scrollTop < scrollHeight - clientHeight - 10;
    setHasUserScrolled(hasUserScrolled);
  };

  useEffect(() => {
    // Scroll to bottom on re-renders
    if (scrollToBottom && scrollRef && scrollRef.current) {
      if (!hasUserScrolled) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  });

  const messageDepth = (messages, message: any, depth: string = 0) => {
    if (depth > 5) {
      return depth
    }
    const index = messages.findLastIndex(i => i.parentTaskId && i.taskId === message.taskId);
    if (index > -1) {
      const { parentTaskId } = messages[index]
      if (parentTaskId) {
        const parentIndex = messages.findLastIndex(i => i.taskId && i.taskId === parentTaskId);
        if (parentIndex > -1) {
          return messageDepth(messages, messages[parentIndex], depth + 1)
        }
      }
    }
    return depth
  }
  console.log('messages', messages)

  return (
    <div
      className={
        "border-translucent flex w-full flex-col rounded-2xl border-2 border-white/20 bg-zinc-900 text-white shadow-2xl drop-shadow-lg " +
        (className ?? "")
      }
    >
      <MacWindowHeader title={title} messages={messages} onSave={onSave} />
      <div
        className={clsx(
          "mb-2 mr-2 ",
          (fullscreen && "max-h-[75vh] flex-grow overflow-auto") ||
            "window-heights"
        )}
        ref={scrollRef}
        onScroll={handleScroll}
        id={messageListId}
      >
        {messages.map((message, index) => (
          <FadeIn key={`${index}-${message.type}`}>
            <ChatMessage message={message} depth={messageDepth(messages, message, 0)} />
          </FadeIn>
        ))}
        {children}

        {messages.length === 0 && (
          <>
            <Expand delay={0.8} type="spring">
              <ChatMessage
                message={{
                  type: "system",
                  value: t("create-agent-and-deploy"),
                }}
              />
            </Expand>
            <Expand delay={0.9} type="spring">
              <ChatMessage
                message={{
                  type: "system",
                  value: `📢 ${t("provide-api-key-via-settings")}`,
                }}
              />
              {showDonation && (
                <Expand delay={0.7} type="spring">
                  <DonationMessage showWeChatPay={showWeChatPay} />
                </Expand>
              )}
            </Expand>
          </>
        )}
      </div>
    </div>
  );
};

interface HeaderProps {
  title?: string | ReactNode;
  messages: Message[];
  onSave?: (format: string) => void;
}

const MacWindowHeader = (props: HeaderProps) => {
  const { t } = useTranslation(["chat", "common"]);

  const saveElementAsImage = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    htmlToImage
      .toJpeg(element, {
        height: element.scrollHeight,
        style: {
          overflowY: "visible",
          maxHeight: "none",
          border: "none",
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "auto-gpt-output.png";
        link.click();
      })
      .catch(console.error);
  };

  const copyElementText = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    const text = element.innerText;
    void navigator.clipboard.writeText(text);
  };

  const exportOptions = [
    <WindowButton
      key="Image"
      delay={0.1}
      onClick={(): void => saveElementAsImage(messageListId)}
      icon={<FaImage size={12} />}
      name={t("common:image")}
    />,
    <WindowButton
      key="Copy"
      delay={0.15}
      onClick={(): void => copyElementText(messageListId)}
      icon={<FaClipboard size={12} />}
      name={t("common:copy")}
    />,
    <PDFButton key="PDF" name="PDF" messages={props.messages} />,
  ];

  return (
    <div className="flex items-center gap-1 overflow-visible rounded-t-3xl p-3">
      <PopIn delay={0.4}>
        <div className="h-3 w-3 rounded-full bg-red-500" />
      </PopIn>
      <PopIn delay={0.5}>
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
      </PopIn>
      <PopIn delay={0.6}>
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </PopIn>
      <div className="flex flex-grow font-mono text-sm font-bold text-gray-600 sm:ml-2">
        {props.title}
      </div>
      {props.onSave && (
        <WindowButton
          delay={0.8}
          onClick={() => props.onSave?.("db")}
          icon={<FaSave size={12} />}
          name={t("common:save") as string}
        />
      )}
      <Menu
        name={t("common:export")}
        onChange={() => null}
        items={exportOptions}
        styleClass={{
          container: "relative",
          input: `bg-[#3a3a3a] w-28 animation-duration text-left px-4 text-sm p-1 font-mono rounded-lg text-gray/50 border-[2px] border-white/30 font-bold transition-all sm:py-0.5 hover:border-[#1E88E5]/40 hover:bg-[#6b6b6b] focus-visible:outline-none focus:border-[#1E88E5]`,
          option: "w-full py-[1px] md:py-0.5",
        }}
      />
    </div>
  );
};
const ChatMessage = ({ message, depth }: { message: Message, depth?: number }) => {
  const { t } = useTranslation(["chat", "common"]);
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopyClick = () => {
    void navigator.clipboard.writeText(message.value);
    setCopied(true);
  };
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (copied) {
      timeoutId = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [copied]);
  return (
    <div
      className="mx-2 my-1 rounded-lg border-[2px] border-white/10 bg-white/20 p-1 font-mono text-sm hover:border-[#1E88E5]/40 sm:mx-4 sm:p-3 sm:text-base"
      style={{marginLeft: `${depth * 40 + 20}px`}}
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
      onClick={handleCopyClick}
    >
      {message.type != "system" && (
        // Avoid for system messages as they do not have an icon and will cause a weird space
        <>
          <div className="mr-2 inline-block h-[0.9em]">
            {getMessageIcon(message)}
          </div>
          <span className="mr-2 font-bold">{getMessagePrefix(message)}</span>
        </>
      )}

      {message.type == "thinking" && (
        <span className="italic text-zinc-400">({t("restart")})</span>
      )}

      {message.type == "action" ? (
        <div className="prose ml-2 max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {t(message.value)}
          </ReactMarkdown>
        </div>
      ) : (
        <span>{t(message.value)}</span>
      )}

      <div className="relative">
        {copied ? (
          <span className="absolute bottom-0 right-0 rounded-full border-2 border-white/30 bg-zinc-800 p-1 px-2 text-gray-300">
            {t("common:copied")}!
          </span>
        ) : (
          <span
            className={`absolute bottom-0 right-0 rounded-full border-2 border-white/30 bg-zinc-800 p-1 px-2 ${
              showCopy ? "visible" : "hidden"
            }`}
          >
            <FaCopy className="text-white-300 cursor-pointer" />
          </span>
        )}
      </div>
    </div>
  );
};

const DonationMessage = ({ showWeChatPay }: { showWeChatPay?: () => void }) => {
  const { t } = useTranslation(["chat", "common"]);
  return (
    <div className="mx-2 my-1 flex flex-col gap-2 rounded-lg border-[2px] border-white/10 bg-blue-500/20 p-1 text-center font-mono hover:border-[#1E88E5]/40 sm:mx-4 sm:p-3 sm:text-base md:flex-row">
      <div className="max-w-none flex-grow">
        <Trans i18nKey="donate-help" ns="chat">
          💝️ Help support the advancement of AutoGPT Next Web. 💝 <br /> Please
          consider donating help fund our high infrastructure costs.
        </Trans>
      </div>
      <div className="flex items-center justify-center">
        <Button
          className="sm:text m-0 rounded-full text-sm "
          onClick={showWeChatPay}
        >
          {t("donate-now")} 🚀
        </Button>
      </div>
    </div>
  );
};

const getMessageIcon = (message: Message) => {
  switch (message.type) {
    case "goal":
      return <FaStar className="text-yellow-300" />;
    case "task":
      return <FaListAlt className="text-gray-300" />;
    case "thinking":
      return <FaBrain className="mt-[0.1em] text-pink-400" />;
    case "action":
      return <FaPlayCircle className="text-green-500" />;
  }
};

const getMessagePrefix = (message: Message) => {
  const { t } = useTranslation("chat");

  switch (message.type) {
    case "goal":
      return t("new-goal");
    case "task":
      return t("added-task");
    case "thinking":
      return t("thinking");
    case "action":
      return message.info ? t(message.info) : t("executing");
  }
};

export default ChatWindow;
export { ChatMessage };
