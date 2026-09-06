import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Where an uploaded PDF goes.
//
// On a serverless host the filesystem is ephemeral and per-instance: a file written to
// public/uploads survives until that instance is recycled, which can be minutes, and is
// invisible to every other instance in the meantime. So in production this writes to Vercel
// Blob and stores the returned public URL on the post.
//
// The local-disk path is kept deliberately, for local development without cloud credentials
// — but it is chosen by the absence of a token, and the app warns rather than silently
// behaving differently in the two places.

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 25 * 1024 * 1024;

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function saveUploadedPdf(file: File): Promise<UploadResult> {
  if (file.type !== "application/pdf") {
    return { ok: false, message: "Only PDF uploads are supported." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `That PDF is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_BYTES / 1024 / 1024}MB.`,
    };
  }

  const filename = `papers/${randomUUID()}.pdf`;

  if (isBlobConfigured()) {
    try {
      // `public` because these are papers meant to be read; the URL is unguessable, but it
      // isn't a secret either.
      const blob = await put(filename, file, {
        access: "public",
        contentType: "application/pdf",
      });
      return { ok: true, url: blob.url };
    } catch (error) {
      console.error("[storage] Vercel Blob upload failed", error);
      return {
        ok: false,
        message: "Couldn't store that PDF right now. Try again in a moment.",
      };
    }
  }

  // No token: local development. On a deployed serverless host this is a data-loss bug
  // waiting to happen, so it says so loudly in the log.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[storage] BLOB_READ_WRITE_TOKEN is not set in production — this PDF is being written to local disk and will be lost when the instance recycles.",
    );
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const local = `${randomUUID()}.pdf`;
    await writeFile(path.join(UPLOAD_DIR, local), Buffer.from(await file.arrayBuffer()));
    return { ok: true, url: `/uploads/${local}` };
  } catch (error) {
    console.error("[storage] local upload failed", error);
    return { ok: false, message: "Couldn't save that PDF. Try again in a moment." };
  }
}
