import { useEffect, useState } from "react";
import {
  getEmails,
  searchEmails,
  type Email,
} from "../services/api";

type SentProps = {
  searchQuery?: string;
};

export default function Sent({
  searchQuery = "",
}: SentProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadSentEmails() {
      try {
        setLoading(true);
        setError(null);

        const query = searchQuery.trim();

        const sentEmails = query
          ? await searchEmails(query, "sent")
          : await getEmails("sent");

        setEmails(sentEmails);
      } catch (error) {
        console.error(
          "Failed to load sent emails:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load sent emails.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSentEmails();
  }, [searchQuery]);

  const formatSentTime = (
    date: string | null,
  ) => {
    if (!date) return "—";

    return new Date(date).toLocaleString(
      "en-IN",
      {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      },
    );
  };

  if (loading) {
    return (
      <div className="px-5 py-8 text-center text-[11px] text-gray-400">
        Loading sent emails...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-8 text-center text-[11px] text-red-500">
        {error}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-[12px] font-medium text-gray-600">
          No sent emails
        </p>

        <p className="mt-1 text-[10px] text-gray-400">
          Sent and failed emails will appear here.
        </p>
      </div>
    );
  }

  return (
    <section>
      {emails.map((email) => {
        const isSent =
          email.status === "SENT";

        return (
          <article
            key={email.id}
            className="flex min-h-[43px] items-center border-b border-gray-100 px-5 text-[10px]"
          >
            <div className="w-[145px] shrink-0 truncate text-gray-800">
              <span className="font-medium">
                To:{" "}
              </span>
              {email.recipientEmail}
            </div>

            <div
              className={`mr-3 shrink-0 rounded-full px-2 py-1 text-[8px] ${
                isSent
                  ? "bg-[#eaf7ef] text-[#00a63c]"
                  : "bg-[#fff0f0] text-red-500"
              }`}
            >
              {isSent
                ? "Sent"
                : "Failed"}
            </div>

            <div className="min-w-0 flex-1 truncate">
              <span className="font-medium text-gray-800">
                {email.subject}
              </span>

              <span className="ml-1 text-gray-400">
                -{" "}
                {email.body
                  .replace(/\s+/g, " ")
                  .slice(0, 80)}
              </span>
            </div>

            <div className="ml-4 w-[125px] shrink-0 text-right text-[9px] text-gray-400">
              {formatSentTime(
                email.sentAt,
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}