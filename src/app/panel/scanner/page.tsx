import { redirect } from "next/navigation";

// El scanner se reemplazó por el detalle de cada cliente (Clientes → cliente).
// Se mantiene la ruta para no romper accesos guardados.
export default function ScannerPage() {
  redirect("/panel/clientes");
}
