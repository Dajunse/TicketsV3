"use client";

import { useState } from "react";
import { resetClientUserPasswordAction } from "@/actions/admin-actions";

type Props = {
  clientId: string;
  userId: string;
};

function randomIndex(max: number) {
  if (typeof window !== "undefined" && window.crypto) {
    const bytes = new Uint32Array(1);
    window.crypto.getRandomValues(bytes);
    return bytes[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function generateSuggestedPassword(length = 16) {
  const safeLength = Math.max(12, length);
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%*-_";
  const all = `${lower}${upper}${digits}${symbols}`;

  const chars = [
    lower[randomIndex(lower.length)],
    upper[randomIndex(upper.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];

  for (let i = chars.length; i < safeLength; i += 1) {
    chars.push(all[randomIndex(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
}

export function ResetClientPasswordForm({ clientId, userId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-2 space-y-2">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setCopied(false);
            setNewPassword("");
          }}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Cambiar contrasena
        </button>
      ) : (
        <form
          action={resetClientUserPasswordAction}
          className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center"
          onSubmit={(event) => {
            const ok = window.confirm("Se restablecera la contrasena y se cerraran sesiones activas. Continuar?");
            if (!ok) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="userId" value={userId} />
          <input
            name="newPassword"
            type="text"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setCopied(false);
            }}
            placeholder="Escribe una contrasena o pulsa Sugerir"
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              setNewPassword(generateSuggestedPassword());
              setCopied(false);
            }}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            Sugerir
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!newPassword) return;
              await navigator.clipboard.writeText(newPassword);
              setCopied(true);
            }}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            type="submit"
            className="rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setCopied(false);
              setNewPassword("");
            }}
            className="rounded-md border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-200"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
