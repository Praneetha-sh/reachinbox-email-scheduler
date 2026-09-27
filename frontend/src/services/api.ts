export type User = {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export type Sender = {
  id: string;
  email: string;
  name: string | null;
};

export type EmailStatus =
  | "SCHEDULED"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "RATE_LIMITED"
  | "CANCELLED";

export type Email = {
  id: string;
  recipientName: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
};

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ?? "Something went wrong.",
    );
  }

  return data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiRequest<{
    status: string;
    user: User;
  }>("/api/auth/me");

  return response.user;
}

export async function logout(): Promise<void> {
  await apiRequest("/api/auth/logout", {
    method: "POST",
  });
}

export async function getEmails(
  status: "scheduled" | "sent",
): Promise<Email[]> {
  const params = new URLSearchParams();

  if (status === "scheduled") {
    params.set("status", "SCHEDULED");
  } else {
    params.set("status", "SENT");
  }

  const response = await apiRequest<{
    status: string;
    emails: Email[];
  }>(`/api/emails?${params.toString()}`);

  return response.emails;
}

export async function getSenders(): Promise<Sender[]> {
  const response = await apiRequest<{
    status: string;
    senders: Sender[];
  }>("/api/senders");

  return response.senders;
}

export type ScheduleEmailsInput = {
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
  recipients: Array<{
  email: string;
}>;
};

export type ScheduleEmailsResponse = {
  status: string;
  message?: string;
  campaignId: string;
  emailCount: number;
  emails: Array<{
    id: string;
    recipientEmail: string;
    scheduledAt: string;
    status: EmailStatus;
  }>;
};

export async function scheduleEmails(
  input: ScheduleEmailsInput,
): Promise<ScheduleEmailsResponse> {
  const idempotencyKey = crypto.randomUUID();

  return apiRequest<ScheduleEmailsResponse>(
    "/api/emails/schedule",
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(input),
    },
  );
}

export async function searchEmails(
  query: string,
  status?: "scheduled" | "sent",
): Promise<Email[]> {
  const params = new URLSearchParams();

  params.set("q", query);

  if (status) {
    params.set("status", status);
  }

  const response = await apiRequest<{
    status: string;
    emails: Email[];
  }>(
    `/api/search/emails?${params.toString()}`,
  );

  return response.emails;
}