import "server-only";

import { randomUUID } from "node:crypto";
import {
  mentorMediaBucket,
  mentorMediaBytes,
  mentorMediaPath,
  mentorMediaSide,
} from "@/lib/mentor-media";
import type { createSupabaseAdminClient } from "@/server/supabase/clients";

function readDimensions(bytes: Buffer, type: string, start: number, length: number) {
  if (type === "VP8 " && length > 10 && bytes.readUIntBE(start + 3, 3) === 0x9d012a) {
    return [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
  }
  if (type === "VP8L" && length > 5 && bytes[start] === 0x2f) {
    const header = bytes.readUInt32LE(start + 1);
    return [(header & 0x3fff) + 1, ((header >>> 14) & 0x3fff) + 1];
  }
  return null;
}

export function validMentorWebP(bytes: Buffer) {
  if (
    bytes.length < 26 ||
    bytes.length > mentorMediaBytes ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.readUInt32LE(4) !== bytes.length - 8 ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  )
    return false;

  let canvas: number[] | null = null;
  let image: number[] | null = null;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length + (length % 2);
    if (end > bytes.length || type === "ANIM" || type === "ANMF") return false;
    if (type === "VP8X") {
      if (length !== 10 || offset !== 12 || (bytes[start] & 2) !== 0) return false;
      canvas = [bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1];
    }
    if (type === "VP8 " || type === "VP8L") {
      if (image) return false;
      image = readDimensions(bytes, type, start, length);
      if (!image) return false;
    }
    offset = end;
  }
  return (
    offset === bytes.length &&
    Boolean(
      image?.every(
        (value, i) => value > 0 && value <= mentorMediaSide && (!canvas || canvas[i] === value)
      )
    )
  );
}

export async function readMentorUpload(entry: FormDataEntryValue | null) {
  if (entry === null || (typeof entry !== "string" && entry.size === 0)) return null;
  if (typeof entry === "string" || entry.type !== "image/webp" || entry.size > mentorMediaBytes) {
    return false;
  }
  const bytes = Buffer.from(await entry.arrayBuffer());
  return validMentorWebP(bytes) ? bytes : false;
}

export async function uploadMentorImage(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  image: Buffer
) {
  const key = `${randomUUID()}.webp`;
  const { error } = await admin.storage.from(mentorMediaBucket).upload(key, image, {
    contentType: "image/webp",
    upsert: false,
  });
  return error ? null : { key, source: mentorMediaPath + key };
}
