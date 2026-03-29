/**
 * Zaokrąglenie do groszy. Usuwa artefakty zmiennoprzecinkowe (np. -1e-15),
 * które przy formatowaniu dają „-0,00” i mylą warunki koloru (niedopłata vs zero).
 */
export function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}
