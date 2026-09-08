import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход в личный кабинет — Pulse" },
      {
        name: "description",
        content:
          "Войдите в личный кабинет Pulse, чтобы сохранить подписку, историю тренировок и планы восстановления от AI-тренера.",
      },
      { property: "og:title", content: "Вход в личный кабинет — Pulse" },
      {
        property: "og:description",
        content: "Аккаунт Pulse: подписка, история показателей и планы восстановления.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/cabinet", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/cabinet",
          data: { full_name: name },
        },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Проверьте почту — мы отправили письмо для подтверждения.");
      else navigate({ to: "/cabinet", replace: true });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else navigate({ to: "/cabinet", replace: true });
    }
    setBusy(false);
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <div className="aurora-blob-a absolute -top-40 left-1/4 size-[520px] rounded-full bg-aurora-1/40 blur-[140px]" />
        <div className="aurora-blob-b absolute bottom-0 -right-24 size-[520px] rounded-full bg-aurora-2/40 blur-[150px]" />
      </div>

      <div className="glass-panel w-full max-w-md p-8">
        <Link to="/" className="text-xs text-muted-foreground">
          ← На главную
        </Link>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          {mode === "login" ? "Вход в кабинет" : "Регистрация"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Аккаунт хранит вашу подписку и историю показателей.
        </p>

        <form className="mt-6 space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              className="w-full rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-sm focus:outline-none"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Почта"
            className="w-full rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-sm focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-aurora-1 to-aurora-2 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Секунду…" : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm text-aurora-4">{msg}</p>}

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMsg("");
          }}
          className="mt-5 text-sm text-muted-foreground underline"
        >
          {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}
