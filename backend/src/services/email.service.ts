import "dotenv/config";
import nodemailer from "nodemailer";
import { prisma } from "../config/prisma.js";

export interface SendEmailInput {
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const sender = await prisma.sender.findUnique({
    where: {
      id: input.senderId,
    },
  });

  if (!sender) {
    throw new Error(
      `Sender ${input.senderId} was not found.`,
    );
  }

  if (!sender.isActive) {
    throw new Error(
      `Sender ${input.senderId} is inactive.`,
    );
  }

  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465,
    auth: {
      user: sender.smtpUsername,
      pass: sender.smtpPasswordEncrypted,
    },
  });

  const info = await transporter.sendMail({
    from: `"${sender.name ?? "ReachInbox"}" <${sender.email}>`,
    to: input.recipientEmail,
    subject: input.subject,
    text: input.body,
    html: input.body,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}