import type { Metadata } from "next";
import ConfessionBrowser from "./confession-browser";

export const metadata: Metadata = {
  title: "Confesión Bautista de Fe de 1689",
  description: "Lee y explora los 32 capítulos de la Confesión Bautista de Fe de 1689.",
};

export default function Home() {
  return <ConfessionBrowser />;
}
