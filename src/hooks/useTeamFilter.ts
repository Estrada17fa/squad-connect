import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";

/**
 * Estado del filtro de categoría de una página. Arranca en la categoría
 * PRINCIPAL del club (si el usuario tiene acceso a ella); "Todos" sigue
 * disponible, solo deja de ser el valor inicial.
 */
export function useTeamFilter() {
  const { primaryTeamId } = useApp();
  const [value, setValue] = React.useState<string | null>(primaryTeamId);
  const initialized = React.useRef(primaryTeamId !== null);

  React.useEffect(() => {
    if (!initialized.current && primaryTeamId) {
      initialized.current = true;
      setValue(primaryTeamId);
    }
  }, [primaryTeamId]);

  return [value, setValue] as const;
}
