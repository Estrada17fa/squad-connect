import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionByEvent } from "@/hooks/useTraining";
import { SessionDetailSheet } from "@/components/entrenamientos/SessionDetailSheet";

/**
 * Acceso al plan de la sesión desde el Calendario.
 *
 * Solo aparece si el evento de entrenamiento tiene una sesión ligada. Se abre
 * siempre en modo consulta: editar el plan vive en el módulo Entrenamientos.
 */
export function TrainingPlanButton({
  eventId,
  eventType,
}: {
  eventId: string;
  eventType: string;
}) {
  const enabled = eventType === "entrenamiento";
  const { data: session } = useSessionByEvent(enabled ? eventId : null);
  const [open, setOpen] = React.useState(false);

  if (!enabled || !session) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <ClipboardList className="mr-2 h-4 w-4" /> Ver plan del entrenamiento
      </Button>
      <SessionDetailSheet open={open} onOpenChange={setOpen} session={session} readOnly />
    </>
  );
}
