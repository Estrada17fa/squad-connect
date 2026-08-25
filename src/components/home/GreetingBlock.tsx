/**
 * Bloque 1 de Inicio: saludo simple. Solo presentación.
 */
export function GreetingBlock({ name }: { name: string | null }) {
  return (
    <header className="space-y-1">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        {name ? `Hola, ${name}` : "Hola"}
      </h1>
      <p className="text-sm text-muted-foreground">Esto es lo que pasa en el club</p>
    </header>
  );
}
