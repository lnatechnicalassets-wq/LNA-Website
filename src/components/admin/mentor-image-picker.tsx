"use client";

import Image from "next/image";
import { ChevronDown, ImageIcon, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { peopleCopy as copy, peopleFieldClass } from "@/lib/admin-people";
import { mentorMediaBytes, mentorMediaSide } from "@/lib/mentor-media";

async function resizeImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15_000_000) {
    throw new Error(copy.mediaInvalid);
  }
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, mentorMediaSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(copy.mediaInvalid);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.88)
    );
    if (!blob || blob.type !== "image/webp" || blob.size > mentorMediaBytes) {
      throw new Error(copy.mediaInvalid);
    }
    return new File([blob], "mentor.webp", { type: "image/webp" });
  } finally {
    image.close();
  }
}

export function MentorImagePicker({
  name,
  label,
  choices,
  value,
  source,
  onChange,
  onPreview,
}: {
  name: "photo" | "logo";
  label: string;
  choices: string[];
  value: string;
  source?: string;
  onChange: (value: string) => void;
  onPreview: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const revision = useRef(0);

  useEffect(() => {
    if (!file) {
      onPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    onPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, onPreview]);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const element = event.currentTarget;
    const raw = element.files?.[0];
    if (!raw) return;
    const selected = ++revision.current;
    element.setCustomValidity(copy.mediaProcessing);
    setStatus(copy.mediaProcessing);
    try {
      const prepared = await resizeImage(raw);
      if (selected !== revision.current) return;
      const transfer = new DataTransfer();
      transfer.items.add(prepared);
      element.files = transfer.files;
      setFile(prepared);
      setStatus(copy.mediaSelected(raw.name));
    } catch {
      if (selected !== revision.current) return;
      element.value = "";
      setFile(null);
      setStatus(copy.mediaInvalid);
    } finally {
      if (selected === revision.current) element.setCustomValidity("");
    }
  }

  const sources = choices.includes(value) || !value ? choices : [value, ...choices];
  return (
    <div className="min-w-0 rounded-xl border border-border-subtle px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50 text-primary-800">
          {source ? (
            <Image
              src={source}
              alt=""
              fill
              sizes="48px"
              unoptimized
              className={name === "photo" ? "object-cover object-top" : "object-contain p-1"}
            />
          ) : (
            <ImageIcon aria-hidden="true" className="size-4" />
          )}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium leading-tight">{label}</p>
          <label className="relative inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-primary-900 hover:bg-primary-50 focus-within:outline-2 focus-within:outline-primary-600">
            <Upload aria-hidden="true" className="size-3.5" />
            <span>{file ? copy.replaceUpload : copy.uploadImage}</span>
            <input
              ref={input}
              name={`${name}File`}
              type="file"
              aria-label={
                file
                  ? `${copy.replaceUpload} ${label.toLowerCase()}`
                  : `${copy.uploadImage} ${label.toLowerCase()}`
              }
              accept="image/jpeg,image/png,image/webp"
              onChange={pick}
              className="sr-only"
            />
          </label>
        </div>
      </div>
      {status && (
        <p role="status" className="mt-2 break-words text-xs text-text-secondary">
          {status}
        </p>
      )}
      <details className="group mt-2">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded text-xs font-medium text-primary-900 focus-visible:outline-2 focus-visible:outline-primary-600">
          {copy.existingImages}
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <select
          aria-label={copy.existingImage(label)}
          name={name}
          value={value}
          className={peopleFieldClass}
          onChange={(event) => {
            revision.current++;
            if (input.current) {
              input.current.value = "";
              input.current.setCustomValidity("");
            }
            setFile(null);
            setStatus("");
            onChange(event.currentTarget.value);
          }}
        >
          <option value="">{copy.automaticImage}</option>
          {sources.map((asset) => (
            <option key={asset} value={asset}>
              {asset.startsWith("/api/") ? copy.savedImage : asset.split("/").at(-1)}
            </option>
          ))}
        </select>
      </details>
      {file && (
        <button
          type="button"
          className="min-h-8 text-xs font-medium text-primary-900 underline"
          onClick={() => {
            if (input.current) input.current.value = "";
            setFile(null);
            setStatus("");
          }}
        >
          {copy.clearUpload}
        </button>
      )}
    </div>
  );
}
