import * as React from "react";
import { toast } from "sonner";
import { FileSearch, Sparkles } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { personLabel } from "@/lib/tripLogistics";
import type { TripFlight } from "@/hooks/useTripFlights";
import { useBoardingPassMutations, type BoardingPassBatchItem } from "@/hooks/useTripBoardingPasses";
import {
  extractPdfPages,
  matchPerson,
  splitPdfPage,
  type MatchConfidence,
  type PageExtract,
} from "@/lib/boardingPassMatch";

const NONE = "__none__";

interface Row extends PageExtract {
  userId: string | null;
  confidence: MatchConfidence;
}

const CONFIDENCE_LABEL: Record<MatchConfidence, string> = {
  alta: "Coincidencia alta",
  media: "Revisar",
  ninguna: "Sin coincidencia",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  flight: TripFlight;
}

/**
 * Sube un PDF con varios pases, lo separa por páginas, propone a quién
 * pertenece cada uno y sólo guarda cuando el editor confirma.
 */
export function BoardingPassAutoMatchSheet({ open, onOpenChange, tripId, flight }: Props) {
  const { uploadBatch, upload } = useBoardingPassMutations(tripId);
  const [file, setFile] = React.useState<File | null>(null);
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [noText, setNoText] = React.useState(false);

  React.useEffect(() => {
    if (open) return;
    setFile(null);
    setRows(null);
    setAnalyzing(false);
    setNoText(false);
  }, [open]);

  const people = flight.passengers.map((p) => ({ user_id: p.user_id, label: personLabel(p.profile) }));

  const analyze = async (f: File) => {
    setAnalyzing(true);
    setNoText(false);
    setRows(null);
    const pages = await extractPdfPages(f);
    setAnalyzing(false);
    if (!pages || pages.length === 0) {
      setNoText(true);
      toast.error("No se pudo leer el PDF. Puedes cargar los pases manualmente.");
      return;
    }
    if (!pages.some((p) => p.hasText)) {
      setNoText(true);
      toast.warning("Este PDF parece escaneado: no permite detección automática de nombres.");
    }
    setRows(
      pages.map((p) => {
        const m = matchPerson(p.nameGuess, people);
        return { ...p, userId: m.userId, confidence: m.confidence };
      }),
    );
  };

  const confirm = async () => {
    if (!file || !rows) return;
    try {
      const items: BoardingPassBatchItem[] = [];
      for (const r of rows) {
        const blob = await splitPdfPage(file, r.page - 1);
        items.push({
          blob,
          ext: "pdf",
          input: {
            user_id: r.userId,
            seat: r.seat,
            boarding_group: null,
            terminal: null,
            notes: null,
          },
        });
      }
      uploadBatch.mutate(
        { flightId: flight.id, items },
        {
          onSuccess: () => {
            toast.success(`${items.length} pase(s) guardado(s)`);
            onOpenChange(false);
          },
          onError: (e: any) => toast.error(e.message ?? "No se pudieron guardar los pases"),
        },
      );
    } catch {
      toast.error("No se pudo separar el PDF. Carga los pases manualmente.");
    }
  };

  const uploadWhole = () => {
    if (!file) return;
    upload.mutate(
      {
        flightId: flight.id,
        file,
        input: { user_id: null, seat: null, boarding_group: null, terminal: null, notes: null },
      },
      {
        onSuccess: () => {
          toast.success("PDF cargado sin asignar. Asigna los pases a mano.");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo subir el PDF"),
      },
    );
  };

  const assignedCount = rows?.filter((r) => r.userId).length ?? 0;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Repartir pases desde un PDF
        </EntitySheetTitle>
        <EntitySheetDescription>
          {flight.flight_code} · Nada se guarda hasta que confirmes las asignaciones.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="bp-auto-file">PDF con varios pases</Label>
          <Input
            id="bp-auto-file"
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setRows(null);
              if (f) void analyze(f);
            }}
          />
          {analyzing ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileSearch className="h-3.5 w-3.5" /> Analizando páginas…
            </p>
          ) : null}
        </div>

        {noText && file ? (
          <div className="glass space-y-3 p-4">
            <p className="text-sm text-foreground">Este PDF no permite detectar nombres automáticamente.</p>
            <p className="text-xs text-muted-foreground">
              Puedes cargarlo completo como un pase sin asignar y repartirlo a mano, o cerrarlo y usar la carga manual
              por persona.
            </p>
            <Button type="button" variant="outline" disabled={upload.isPending} onClick={uploadWhole}>
              Cargar PDF sin asignar
            </Button>
          </div>
        ) : null}

        {rows ? (
          <section className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {rows.length} pase(s) detectado(s) · {assignedCount} con persona
            </p>
            <ul className="space-y-2">
              {rows.map((r, i) => (
                <li key={r.page} className="glass space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Página {r.page}</p>
                    <Badge variant={r.confidence === "alta" ? "default" : "secondary"}>
                      {CONFIDENCE_LABEL[r.confidence]}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-foreground">
                    {r.nameGuess ?? "Sin nombre detectado"}
                    {r.seat ? <span className="text-muted-foreground"> · Asiento {r.seat}</span> : null}
                  </p>
                  <Select
                    value={r.userId ?? NONE}
                    onValueChange={(v) =>
                      setRows((prev) =>
                        prev
                          ? prev.map((row, idx) =>
                              idx === i ? { ...row, userId: v === NONE ? null : v, confidence: "alta" } : row,
                            )
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin asignar</SelectItem>
                      {people.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="glow-primary"
          disabled={!rows || uploadBatch.isPending}
          onClick={() => void confirm()}
        >
          {uploadBatch.isPending ? "Guardando…" : "Confirmar y guardar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
