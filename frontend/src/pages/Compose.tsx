import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  getSenders,
  scheduleEmails,
  type Sender,
} from "../services/api";

export default function Compose() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");

  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [delayBetweenMs, setDelayBetweenMs] = useState("1000");
  const [hourlyLimit, setHourlyLimit] = useState("100");
  const [startTime, setStartTime] = useState("");

  const [uploadedFileName, setUploadedFileName] =
    useState<string | null>(null);

  const [loadingSenders, setLoadingSenders] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSenders() {
      try {
        setLoadingSenders(true);

        const senderList = await getSenders();

        setSenders(senderList);

        if (senderList.length > 0) {
          setSenderId(senderList[0].id);
        }
      } catch (error) {
        console.error("Failed to load senders:", error);

        setScheduleError(
          error instanceof Error
            ? error.message
            : "Failed to load senders.",
        );
      } finally {
        setLoadingSenders(false);
      }
    }

    loadSenders();
  }, []);

  const addRecipient = () => {
    const value = recipientInput.trim();

    if (!value) {
      return;
    }

    const emails = value
      .split(/[,\s]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    const validEmails = emails.filter((email) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );

    setRecipients((current) => {
      const combined = [...current, ...validEmails];

      return Array.from(new Set(combined));
    });

    setRecipientInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients((current) =>
      current.filter((recipient) => recipient !== email),
    );
  };

  const handleRecipientKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addRecipient();
    }

    if (
      event.key === "Backspace" &&
      !recipientInput &&
      recipients.length > 0
    ) {
      setRecipients((current) => current.slice(0, -1));
    }
  };

  const handleFileUpload = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadedFileName(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result ?? "");

      const possibleEmails =
        text.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
        ) ?? [];

      const uniqueEmails = Array.from(
        new Set(
          possibleEmails.map((email) =>
            email.toLowerCase(),
          ),
        ),
      );

      setRecipients((current) =>
        Array.from(
          new Set([
            ...current,
            ...uniqueEmails,
          ]),
        ),
      );
    };

    reader.readAsText(file);

    event.target.value = "";
  };

  const selectedSender = senders.find(
    (sender) => sender.id === senderId,
  );

  const handleSchedule = async () => {
    if (!senderId) {
      alert("Please select a sender.");
      return;
    }

    if (recipients.length === 0) {
      alert("Please add at least one recipient.");
      return;
    }

    if (!subject.trim()) {
      alert("Please enter a subject.");
      return;
    }

    if (!body.trim()) {
      alert("Please enter the email body.");
      return;
    }

    if (!startTime) {
      alert("Please select a start time.");
      return;
    }

    const delay = Number(delayBetweenMs);
    const limit = Number(hourlyLimit);

    if (!Number.isFinite(delay) || delay < 0) {
      alert("Delay between emails must be 0 or greater.");
      return;
    }

    if (!Number.isFinite(limit) || limit <= 0) {
      alert("Hourly limit must be greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      setScheduleError(null);

      const result = await scheduleEmails({
        senderId,
        subject: subject.trim(),
        body: body.trim(),
        startTime: new Date(startTime).toISOString(),
        delayBetweenMs: delay,
        hourlyLimit: limit,
        recipients: recipients.map((email) => ({
          email,
        })),
      });

      console.log("Emails scheduled successfully:", result);

      // The backend successfully schedules one email per recipient.
      // Therefore use the actual recipient count for the success message.
      const scheduledCount = recipients.length;

      alert(
        `${scheduledCount} email${
          scheduledCount === 1 ? "" : "s"
        } scheduled successfully.`,
      );

      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to schedule emails:", error);

      setScheduleError(
        error instanceof Error
          ? error.message
          : "Failed to schedule emails.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#172033]">
      {/* Header */}
      <header className="flex h-[71px] items-center justify-between border-b border-gray-100 px-4 md:px-7">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 text-[#172033] transition hover:opacity-70"
        >
          <span className="text-[25px] leading-none">
            ←
          </span>

          <span className="text-[23px] font-medium tracking-[-0.5px]">
            Compose New Email
          </span>
        </button>

        <div className="flex items-center gap-5">
          <button
            type="button"
            className="text-[18px] text-gray-500"
            aria-label="Contacts"
          >
            ♧
          </button>

          <button
            type="button"
            className="text-[19px] text-gray-500"
            aria-label="Schedule"
          >
            ◷
          </button>

          <button
            type="button"
            onClick={handleSchedule}
            disabled={submitting}
            className="rounded-full border border-[#00a63c] px-6 py-2.5 text-[12px] font-medium text-[#00a63c] transition hover:bg-[#effcf4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Scheduling..." : "Send Later"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="px-5 py-10 md:px-7">
        <div className="max-w-[1180px]">
          {/* From */}
          <div className="flex min-h-[54px] items-center border-b border-gray-100">
            <div className="w-[70px] shrink-0 text-[13px] font-medium text-[#172033]">
              From
            </div>

            <div className="flex-1">
              {loadingSenders ? (
                <div className="h-[38px] w-[420px] animate-pulse rounded-lg bg-gray-100" />
              ) : senders.length === 0 ? (
                <div className="text-[11px] text-red-500">
                  No active sender accounts found.
                </div>
              ) : (
                <select
                  value={senderId}
                  onChange={(event) =>
                    setSenderId(event.target.value)
                  }
                  className="h-[38px] max-w-[420px] rounded-lg bg-[#f3f6f4] px-3 text-[12px] text-gray-700 outline-none"
                >
                  {senders.map((sender) => (
                    <option
                      key={sender.id}
                      value={sender.id}
                    >
                      {sender.name
                        ? `${sender.name} <${sender.email}>`
                        : sender.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* To */}
          <div className="flex min-h-[54px] items-center border-b border-gray-100">
            <div className="w-[70px] shrink-0 text-[13px] font-medium text-[#172033]">
              To
            </div>

            <div className="flex min-h-[40px] flex-1 items-center gap-2 overflow-x-auto py-2">
              {recipients.map((email) => (
                <span
                  key={email}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-[#eef5f0] px-3 py-1.5 text-[10px] text-gray-700"
                >
                  {email}

                  <button
                    type="button"
                    onClick={() =>
                      removeRecipient(email)
                    }
                    className="text-[13px] text-gray-400 hover:text-gray-700"
                    aria-label={`Remove ${email}`}
                  >
                    ×
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={recipientInput}
                onChange={(event) =>
                  setRecipientInput(event.target.value)
                }
                onKeyDown={handleRecipientKeyDown}
                onBlur={addRecipient}
                placeholder={
                  recipients.length === 0
                    ? "Enter recipient email"
                    : "Add another email"
                }
                className="min-w-[180px] flex-1 bg-transparent text-[11px] text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="shrink-0 text-[12px] font-medium text-[#00a63c] hover:underline"
            >
              ↑ Upload List
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Uploaded file */}
          {uploadedFileName && (
            <div className="flex items-center gap-2 px-[70px] pt-2 text-[10px] text-gray-400">
              <span>Uploaded:</span>

              <span className="rounded-full bg-[#f3f6f4] px-3 py-1 text-gray-600">
                {uploadedFileName}
              </span>

              <span>
                {recipients.length} email
                {recipients.length === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {/* Subject */}
          <div className="flex min-h-[54px] items-center border-b border-gray-100">
            <div className="w-[70px] shrink-0 text-[13px] font-medium text-[#172033]">
              Subject
            </div>

            <input
              type="text"
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
              placeholder="Subject"
              className="flex-1 bg-transparent text-[12px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Scheduling controls */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4 py-4">
            <div className="flex items-center gap-3">
              <label className="text-[13px] text-[#172033]">
                Delay between 2 emails
              </label>

              <input
                type="number"
                min="0"
                value={delayBetweenMs}
                onChange={(event) =>
                  setDelayBetweenMs(event.target.value)
                }
                className="h-[38px] w-[88px] rounded-lg border border-gray-200 px-3 text-[12px] outline-none focus:border-gray-300"
              />

              <span className="text-[10px] text-gray-400">
                ms
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-[13px] text-[#172033]">
                Hourly Limit
              </label>

              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(event) =>
                  setHourlyLimit(event.target.value)
                }
                className="h-[38px] w-[70px] rounded-lg border border-gray-200 px-3 text-[12px] outline-none focus:border-gray-300"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-[13px] text-[#172033]">
                Start time
              </label>

              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) =>
                  setStartTime(event.target.value)
                }
                className="h-[38px] rounded-lg border border-gray-200 px-3 text-[11px] text-gray-600 outline-none"
              />
            </div>
          </div>

          {/* Error */}
          {scheduleError && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-[11px] text-red-600">
              {scheduleError}
            </div>
          )}

          {/* Email editor */}
          <section className="overflow-hidden rounded-xl bg-[#fafafa]">
            <textarea
              value={body}
              onChange={(event) =>
                setBody(event.target.value)
              }
              placeholder="Type Your Reply..."
              className="min-h-[185px] w-full resize-none bg-transparent px-4 py-6 text-[12px] leading-6 text-gray-700 outline-none placeholder:text-gray-400"
            />

            {/* Toolbar */}
            <div className="mx-3 mb-3 flex h-[43px] items-center gap-4 rounded-full border border-gray-100 bg-white px-5 text-[15px] text-gray-500 shadow-sm">
              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Undo"
              >
                ↶
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Redo"
              >
                ↷
              </button>

              <span className="h-5 w-px bg-gray-200" />

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Text"
              >
                T
              </button>

              <button
                type="button"
                className="font-bold hover:text-gray-800"
                aria-label="Bold"
              >
                B
              </button>

              <button
                type="button"
                className="italic hover:text-gray-800"
                aria-label="Italic"
              >
                /
              </button>

              <button
                type="button"
                className="underline hover:text-gray-800"
                aria-label="Underline"
              >
                U
              </button>

              <span className="h-5 w-px bg-gray-200" />

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Align"
              >
                ≡
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Spacing"
              >
                ↕
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Numbered list"
              >
                1.
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Bullet list"
              >
                •
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Decrease indent"
              >
                «
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Increase indent"
              >
                »
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Quote"
              >
                “
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Insert"
              >
                ▣
              </button>

              <button
                type="button"
                className="hover:text-gray-800"
                aria-label="Strikethrough"
              >
                S
              </button>
            </div>
          </section>

          {/* Selected sender information */}
          {selectedSender && (
            <div className="mt-5 text-[10px] text-gray-400">
              Sending from{" "}
              <span className="text-gray-600">
                {selectedSender.email}
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}