import { resolve } from "node:path";
import { DataErrorView } from "@/components/errors/DataErrorView";
import { NetworkWorkspace } from "@/components/network/NetworkWorkspace";
import { todayISO } from "@/lib/dates";
import { loadPeopleFromDirectory } from "@/lib/markdown";
import { toPeopleDataError } from "@/lib/people";
import type { PeopleDataset } from "@/types/person";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentDate = todayISO();
  let dataset: PeopleDataset;

  try {
    dataset = await loadPeopleFromDirectory(
      resolve(process.cwd(), "data/people"),
      currentDate,
    );
  } catch (error) {
    return <DataErrorView error={toPeopleDataError(error)} />;
  }

  return <NetworkWorkspace initialDataset={dataset} currentDate={currentDate} />;
}
