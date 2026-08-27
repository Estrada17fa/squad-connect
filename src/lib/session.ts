import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolución de sesión tolerante a estados transitorios.
 *
 * El guardián de rutas NO debe mandar a login mientras la librería todavía está
 * leyendo la sesión guardada (arranque en frío, PWA instalada, red lenta) ni
 * cuando falla la renovación por falta de conexión. Este helper espera a que la
 * sesión quede realmente resuelta y distingue "no hay sesión" de "no se pudo
 * comprobar ahora".
 */

const INITIAL_SESSION_TIMEOUT = 4000;
/** Margen para renovar antes de que el token venza (segundos). */
const REFRESH_MARGIN = 60;

let lastKnownSession: Session | null = null;

function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /fetch|network|load failed|timeout|offline/i.test(msg);
}

/** Espera al evento de sesión inicial (con tope) cuando `getSession()` viene vacío. */
function waitForInitialSession(): Promise<Session | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (s: Session | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        sub.data.subscription.unsubscribe();
      } catch {
        /* noop */
      }
      resolve(s);
    };
    const timer = setTimeout(() => finish(null), INITIAL_SESSION_TIMEOUT);
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        finish(session ?? null);
      } else if (event === "SIGNED_OUT") {
        finish(null);
      }
    });
  });
}

function isExpiringSoon(session: Session): boolean {
  const exp = session.expires_at;
  if (!exp) return false;
  return exp - Math.floor(Date.now() / 1000) <= REFRESH_MARGIN;
}

/**
 * Devuelve la sesión ya resuelta, o `null` sólo cuando de verdad no hay sesión.
 * Si el token venció y la renovación falla por red, se devuelve la última sesión
 * conocida: nunca se expulsa al usuario por un problema de conexión.
 */
export async function resolveSession(): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  let session: Session | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session ?? null;
  } catch {
    session = null;
  }

  if (!session) {
    session = await waitForInitialSession();
  }

  if (session && isExpiringSoon(session)) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        // Sin conexión -> conservamos la sesión; error de auth real -> fuera.
        if (isNetworkError(error)) return session;
        lastKnownSession = null;
        return null;
      }
      session = data.session ?? session;
    } catch (err) {
      if (isNetworkError(err)) return session;
      lastKnownSession = null;
      return null;
    }
  }

  if (session) lastKnownSession = session;
  else lastKnownSession = null;
  return session;
}

/**
 * Fuerza la renovación del token al volver la app a primer plano.
 * En la PWA instalada los temporizadores internos se congelan en segundo plano,
 * así que al reactivarse hay que renovar a mano.
 */
export function startSessionKeepAlive(): () => void {
  if (typeof window === "undefined") return () => {};

  let running = false;
  const refreshIfNeeded = async () => {
    if (running) return;
    running = true;
    try {
      supabase.auth.startAutoRefresh?.();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session && isExpiringSoon(session)) {
        await supabase.auth.refreshSession();
      }
    } catch {
      /* red intermitente: se reintenta en la siguiente reactivación */
    } finally {
      running = false;
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") void refreshIfNeeded();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", refreshIfNeeded);
  window.addEventListener("online", refreshIfNeeded);
  void refreshIfNeeded();

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", refreshIfNeeded);
    window.removeEventListener("online", refreshIfNeeded);
  };
}
