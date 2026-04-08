"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth-actions";

const initialState = { error: undefined as string | undefined };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-3">
        <label className="block text-sm text-zinc-300" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg px-3 py-2"
          placeholder="cliente@empresa.com"
        />
      </div>
      <div className="space-y-3">
        <label className="block text-sm text-zinc-300" htmlFor="password">
          Contrasena
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-lg px-3 py-2"
          placeholder="********"
        />
      </div>
      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      <button
        disabled={pending}
        type="submit"
        className="w-full rounded-[20px] bg-white px-4 py-2.5 text-sm font-medium text-black shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:bg-zinc-100 hover:translate-y-[1px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.30)] active:translate-y-[2px] active:shadow-[0_3px_10px_rgba(0,0,0,0.24)] disabled:opacity-50"
      >
        {pending ? "Ingresando..." : "inicia sesion"}
      </button>
    </form>
  );
}
