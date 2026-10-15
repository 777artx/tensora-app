import { redirect } from "next/navigation";

/** API Marketplace is coming soon; the nav item is not clickable. Old links land on GPUs. */
export default function ApiMarketplacePage() {
  redirect("/lab/compute");
}
