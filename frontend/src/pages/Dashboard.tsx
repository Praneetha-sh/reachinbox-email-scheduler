import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sent from "./Sent";
import {
  getCurrentUser,
  getEmails,
  logout,
  type Email,
  type User,
} from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [scheduledEmails, setScheduledEmails] =
    useState<Email[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [searchQuery, setSearchQuery] =
    useState("");

  const isSentPage =
    location.pathname.endsWith("/sent");

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser =
          await getCurrentUser();

        setUser(currentUser);
      } catch (error) {
        console.error(
          "Failed to load user:",
          error,
        );

        navigate("/login");
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, [navigate]);

  useEffect(() => {
    async function loadScheduledEmails() {
      if (isSentPage) return;

      try {
        setLoadingEmails(true);
        setError(null);

        const emails =
          await getEmails("scheduled");

        setScheduledEmails(emails);
      } catch (error) {
        console.error(
          "Failed to load scheduled emails:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load scheduled emails.",
        );
      } finally {
        setLoadingEmails(false);
      }
    }

    loadScheduledEmails();
  }, [isSentPage]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(
        "Logout failed:",
        error,
      );
    } finally {
      navigate("/login");
    }
  };

  const handleSlackConnect = () => {
    window.location.href =
      "/api/auth/slack";
  };

  const handleSearch = () => {
    const query = searchQuery.trim();

    if (!query) {
      return;
    }

    /*
     * Elasticsearch search integration is
     * already implemented on the backend.
     * Frontend search will be connected after
     * the core application is stable.
     */
    console.log("Search:", query);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatScheduledTime = (
    date: string,
  ) => {
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

  return (
    <div className="flex min-h-screen bg-white text-[#172033]">
      <aside className="w-[190px] shrink-0 border-r border-gray-100 px-3 py-4">
        <div className="mb-3 px-2">
          <h1 className="text-[25px] font-black tracking-[-2px] text-black">
            OUtB
          </h1>
        </div>

        {loadingUser ? (
          <div className="mb-2 h-[50px] animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <div className="mb-2 flex w-full items-center gap-2 rounded-xl bg-[#f4f7f5] px-2 py-2">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ead5c4] text-[10px] font-semibold">
                {user
                  ? getInitials(user.name)
                  : "U"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-gray-800">
                {user?.name}
              </p>

              <p className="truncate text-[8px] text-gray-400">
                {user?.email}
              </p>
            </div>

            <span className="text-[10px] text-gray-400">
              ⌄
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            navigate("/compose")
          }
          className="mb-5 h-[25px] w-full rounded-full border border-[#00a63c] text-[10px] font-medium text-[#00a63c] transition hover:bg-[#f0fff5]"
        >
          Compose
        </button>

        <p className="mb-2 px-3 text-[8px] uppercase tracking-wide text-gray-400">
          Core
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
          className={`flex h-[28px] w-full items-center justify-between rounded-xl px-3 text-[10px] font-medium ${
            !isSentPage
              ? "bg-[#e2f4e9] text-gray-800"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-[12px]">
              ◷
            </span>
            Scheduled
          </span>

          <span className="text-[9px] text-gray-500">
            {!isSentPage
              ? scheduledEmails.length
              : ""}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/dashboard/sent")
          }
          className={`mt-1 flex h-[28px] w-full items-center justify-between rounded-xl px-3 text-[10px] ${
            isSentPage
              ? "bg-[#e2f4e9] font-medium text-gray-800"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-[12px]">
              ➤
            </span>
            Sent
          </span>

          <span className="text-[9px] text-gray-500">
            —
          </span>
        </button>

        {/* Slack */}
        <button
          type="button"
          onClick={handleSlackConnect}
          className="mt-3 w-full rounded-xl px-3 py-2 text-left text-[10px] text-gray-600 transition hover:bg-[#f4f7f5] hover:text-gray-900"
        >
          <span className="mr-2">
            #
          </span>
          Connect Slack
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full px-3 text-left text-[10px] text-gray-400 hover:text-gray-700"
        >
          Logout
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-[58px] items-center gap-3 border-b border-gray-100 px-5">
          <div className="flex h-[29px] max-w-[500px] flex-1 items-center rounded-full bg-[#f4f7f5] px-4">
            <span className="mr-2 text-[12px] text-gray-400">
              ⌕
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search"
              className="w-full bg-transparent text-[10px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          <button
            type="button"
            className="text-[13px] text-gray-400"
            aria-label="Filter"
          >
            ♢
          </button>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="text-[14px] text-gray-400"
            aria-label="Refresh"
          >
            ↻
          </button>
        </header>

        {!isSentPage && (
          <section>
            {loadingEmails ? (
              <div className="px-5 py-8 text-center text-[11px] text-gray-400">
                Loading scheduled emails...
              </div>
            ) : error ? (
              <div className="px-5 py-8 text-center text-[11px] text-red-500">
                {error}
              </div>
            ) : scheduledEmails.length ===
              0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[12px] font-medium text-gray-600">
                  No scheduled emails
                </p>

                <p className="mt-1 text-[10px] text-gray-400">
                  Your scheduled emails will
                  appear here.
                </p>
              </div>
            ) : (
              scheduledEmails.map(
                (email) => (
                  <article
                    key={email.id}
                    className="flex min-h-[43px] items-center border-b border-gray-100 px-5 text-[10px]"
                  >
                    <div className="w-[145px] shrink-0 truncate text-gray-800">
                      <span className="font-medium">
                        To:{" "}
                      </span>
                      {
                        email.recipientEmail
                      }
                    </div>

                    <div className="mr-3 shrink-0 rounded-full bg-[#fff0df] px-2 py-1 text-[8px] text-[#ed7b1f]">
                      ◷{" "}
                      {formatScheduledTime(
                        email.scheduledAt,
                      )}
                    </div>

                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-gray-800">
                        {email.subject}
                      </span>

                      <span className="ml-1 text-gray-400">
                        -{" "}
                        {email.body
                          .replace(
                            /\s+/g,
                            " ",
                          )
                          .slice(0, 80)}
                      </span>
                    </div>

                    <span className="ml-4 shrink-0 rounded-full bg-[#fff7ed] px-2 py-1 text-[8px] text-[#ed7b1f]">
                      {email.status}
                    </span>
                  </article>
                ),
              )
            )}
          </section>
        )}

        {isSentPage && <Sent />}
      </main>
    </div>
  );
}