import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CategoryOption } from "@/components/coord/tareas/TaskFormSheet";
import { MeetingForm } from "./MeetingForm";

/** Nueva junta en ventana desde abajo, igual que Nueva tarea. */
export function MeetingFormSheet({ open, onOpenChange, clubId, userId, categories }: { open: boolean; onOpenChange: (o: boolean) => void; clubId: string; userId: string; categories: CategoryOption[] }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-0 bg-background px-4 pb-6 pt-4">
        <SheetHeader className="mb-3 text-left"><SheetTitle className="font-display">Nueva junta</SheetTitle></SheetHeader>
        {open ? <MeetingForm inSheet clubId={clubId} userId={userId} categories={categories} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}
