import * as React from "react";
import {
  Activity,
  CalendarRange,
  ChevronDown,
  History,
  Copy,
  Pencil,
  Ruler,
  UtensilsCrossed,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DetailSheet } from "@/components/squad/DetailSheet";
import { HealthCard, HealthEmpty, HealthPersonHeader } from "@/components/salud/HealthPieces";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEquivalences,
  usePlayerNutrition,
  type AssessmentRow,
  type MealPlanRow,
  type RecipeRow,
} from "@/hooks/useNutrition";
import { MealCard } from "@/components/nutricion/NutricionPieces";
import { EquivalenceSheet } from "@/components/nutricion/EquivalenceSheet";
import { RecipeDetailSheet } from "@/components/nutricion/RecipesTab";
import {
  
  MEAL_SLOT_LABEL,
  MEAL_SLOT_ORDER,
  anthroResults,
  fmtNumber,
  formatDay,
  formatShortDay,
  isCurrentWeek,
  somatotypeLabel,
  weekRangeLabel,
  type FoodGroup,
} from "@/lib/nutricion";
import { cn } from "@/lib/utils";


export interface NutritionPlayer {
  userId: string;
  teamId: string;
  fullName: string | null;
  avatarUrl: string | null;
  teamName?: string | null;
  position?: string | null;
}

interface ContentProps {
  player: NutritionPlayer;
  /** Club activo, para leer la guía de equivalencias. */
  clubId?: string | null;
  /** Editor de 'nutricion' en la categoría del jugador. */
  canEdit: boolean;
  /** Vista del propio jugador: sin cabecera de persona. */
  self?: boolean;
  onNewPlan?: () => void;
  onEditPlan?: (p: MealPlanRow) => void;
  onDuplicatePlan?: (p: MealPlanRow) => void;
  onNewAssessment?: () => void;
  onEditAssessment?: (a: AssessmentRow) => void;
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Tarjetas por tiempo de comida: porciones claras, recetas y guía consultable. */
export function MealPlanView({ plan, clubId }: { plan: MealPlanRow; clubId?: string | null }) {
  const equivQ = useEquivalences(clubId);
  const [guideGroup, setGuideGroup] = React.useState<FoodGroup | null>(null);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [recipe, setRecipe] = React.useState<RecipeRow | null>(null);

  const meals = MEAL_SLOT_ORDER.map((slot) => (plan.meals ?? []).find((m) => m.slot === slot)).filter(
    Boolean,
  ) as NonNullable<MealPlanRow["meals"]>;

  if (meals.length === 0) {
    return <p className="text-sm text-muted-foreground">Este plan aún no tiene comidas cargadas.</p>;
  }

  const allRecipes = meals.flatMap((m) => m.recipes ?? []);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            slot={meal.slot}
            portions={(meal.portions ?? []).map((p) => ({
              id: p.id,
              food_group: p.food_group,
              portions: Number(p.portions),
            }))}
            recipes={(meal.recipes ?? [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((r) => ({ id: r.id, name: r.name }))}
            notes={meal.notes}
            onGroupClick={(g) => {
              setGuideGroup(g);
              setGuideOpen(true);
            }}
            onRecipeClick={(id) => {
              const link = allRecipes.find((r) => r.id === id);
              if (link?.recipe) setRecipe(link.recipe as RecipeRow);
            }}
          />
        ))}
      </div>

      <EquivalenceSheet
        open={guideOpen}
        onOpenChange={(v) => {
          setGuideOpen(v);
          if (!v) setGuideGroup(null);
        }}
        equivalences={equivQ.data ?? []}
        group={guideGroup}
      />
      <RecipeDetailSheet open={!!recipe} onOpenChange={(v) => !v && setRecipe(null)} recipe={recipe} />
    </>
  );
}


/** Evolución del peso y del % de grasa a lo largo de los estudios. */
function EvolutionChart({ assessments }: { assessments: AssessmentRow[] }) {
  const rows = React.useMemo(
    () =>
      assessments
        .slice()
        .sort((a, b) => a.assessed_at.localeCompare(b.assessed_at))
        .map((a) => {
          const r = anthroResults(a as any);
          return {
            date: formatShortDay(a.assessed_at),
            peso: a.body_mass_kg == null ? null : Number(a.body_mass_kg),
            grasa: r.bodyFat == null ? null : Number(r.bodyFat.toFixed(1)),
          };
        }),
    [assessments],
  );

  if (rows.length < 2) return null;

  return (
    <div className="glass p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Evolución</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={34} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="var(--primary)" dot />
            <Line
              type="monotone"
              dataKey="grasa"
              name="% grasa"
              stroke="var(--status-pending-foreground)"
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AssessmentCard({
  assessment,
  canEdit,
  onEdit,
}: {
  assessment: AssessmentRow;
  canEdit: boolean;
  onEdit?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const r = anthroResults(assessment as any);
  return (
    <div className="glass space-y-2 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{formatDay(assessment.assessed_at)}</p>
          <p className="text-xs text-muted-foreground">
            {assessment.body_mass_kg != null ? `${Number(assessment.body_mass_kg)} kg` : "Sin peso"}
            {r.bodyFat != null ? ` · ${fmtNumber(r.bodyFat, 1, " % grasa")}` : ""}
            {r.bmi != null ? ` · IMC ${fmtNumber(r.bmi, 1)}` : ""}
          </p>
        </div>
        {canEdit && onEdit ? (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
          </Button>
        ) : null}
      </div>
      {r.somatotype ? (
        <p className="text-xs text-muted-foreground">
          Somatotipo {fmtNumber(r.somatotype.endomorphy)}-{fmtNumber(r.somatotype.mesomorphy)}-
          {fmtNumber(r.somatotype.ectomorphy)} · {somatotypeLabel(r.somatotype)}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-primary"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        {open ? "Ocultar medidas" : "Ver medidas"}
      </button>
      {open ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/5 pt-2 sm:grid-cols-3">
          {Object.entries(assessment)
            .filter(([k, v]) => v != null && k !== "id" && k.match(/^(skf|girth|brd|len|hgt|body|height|sitting|arm)/))
            .map(([k, v]) => (
              <p key={k} className="truncate text-xs text-muted-foreground">
                <span className="text-foreground">{Number(v)}</span> · {k}
              </p>
            ))}
        </div>
      ) : null}
      {assessment.notes ? (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{assessment.notes}</p>
      ) : null}
    </div>
  );
}

/** Ficha de nutrición — misma vista para la nutrióloga y para el jugador. */
export function PlayerNutritionContent({
  player,
  clubId,
  canEdit,
  self,
  onNewPlan,
  onEditPlan,
  onDuplicatePlan,
  onNewAssessment,
  onEditAssessment,
}: ContentProps) {
  const q = usePlayerNutrition(player.userId);
  const plans = q.data?.plans ?? [];
  const assessments = q.data?.assessments ?? [];

  const currentPlan = plans.find((p) => isCurrentWeek(p.week_start, p.week_end)) ?? null;
  const pastPlans = plans.filter((p) => p.id !== currentPlan?.id);
  const latest = assessments[0] ?? null;

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!self ? (
        <HealthPersonHeader
          name={player.fullName ?? "Jugador"}
          avatarUrl={player.avatarUrl}
          subtitle={[player.teamName, player.position].filter(Boolean).join(" · ") || undefined}
          badges={
            latest?.body_mass_kg != null ? (
              <StatusBadge variant="neutral">{Number(latest.body_mass_kg)} kg</StatusBadge>
            ) : (
              <StatusBadge variant="neutral">Sin peso registrado</StatusBadge>
            )
          }
        />
      ) : null}

      <Section
        icon={CalendarRange}
        title="Plan de la semana"
        action={
          canEdit ? (
            <div className="flex gap-2">
              {currentPlan && onDuplicatePlan ? (
                <Button size="sm" variant="ghost" onClick={() => onDuplicatePlan(currentPlan)}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
                </Button>
              ) : null}
              {currentPlan && onEditPlan ? (
                <Button size="sm" variant="secondary" onClick={() => onEditPlan(currentPlan)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
              ) : onNewPlan ? (
                <Button size="sm" variant="secondary" onClick={onNewPlan}>
                  Nuevo plan
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {currentPlan ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {weekRangeLabel(currentPlan.week_start, currentPlan.week_end)} · {currentPlan.week_type}
            </p>
            <MealPlanView plan={currentPlan} clubId={clubId} />
            {currentPlan.notes ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{currentPlan.notes}</p>
            ) : null}
          </div>
        ) : (
          <HealthEmpty
            icon={UtensilsCrossed}
            title="Sin plan esta semana"
            message="Aún no hay un menú semanal asignado para estas fechas."
          />
        )}
      </Section>

      <Section icon={History} title="Historial de planes">
        {pastPlans.length === 0 ? (
          <HealthEmpty icon={History} title="Sin planes anteriores" />
        ) : (
          <div className="space-y-2">
            {pastPlans.map((p) => (
              <HealthCard
                key={p.id}
                title={weekRangeLabel(p.week_start, p.week_end)}
                badge={<StatusBadge variant="neutral">{p.week_type}</StatusBadge>}
                meta={`${(p.meals ?? []).length} tiempos de comida`}
                metaIcon={UtensilsCrossed}
                onClick={canEdit && onEditPlan ? () => onEditPlan(p) : undefined}
              >
                {canEdit && onDuplicatePlan ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePlan(p);
                    }}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar a otra semana
                  </Button>
                ) : null}
              </HealthCard>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={Ruler}
        title="Antropometría"
        action={
          canEdit && onNewAssessment ? (
            <Button size="sm" variant="secondary" onClick={onNewAssessment}>
              Registrar estudio
            </Button>
          ) : null
        }
      >
        {assessments.length === 0 ? (
          <HealthEmpty
            icon={Activity}
            title="Sin estudios"
            message="El peso, la talla y los pliegues se registran aquí."
          />
        ) : (
          <div className="space-y-3">
            <EvolutionChart assessments={assessments} />
            {assessments.map((a) => (
              <AssessmentCard
                key={a.id}
                assessment={a}
                canEdit={canEdit}
                onEdit={onEditAssessment ? () => onEditAssessment(a) : undefined}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export function PlayerNutritionSheet({
  open,
  onOpenChange,
  player,
  ...rest
}: ContentProps & { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={player.fullName ?? "Jugador"}
      icon={UtensilsCrossed}
      description={[player.teamName, player.position].filter(Boolean).join(" · ") || undefined}
      size="lg"
    >
      <PlayerNutritionContent player={player} {...rest} />
    </DetailSheet>
  );
}
