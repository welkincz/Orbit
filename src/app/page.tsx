import { resolve } from "node:path";
import { cache } from "react";
import type { Metadata } from "next";
import { DataErrorView } from "@/components/errors/DataErrorView";
import { EmptyVaultView } from "@/components/errors/EmptyVaultView";
import { NetworkWorkspace } from "@/components/network/NetworkWorkspace";
import { todayISO } from "@/lib/dates";
import { loadPeopleFromDirectory } from "@/lib/markdown";
import { EmptyPeopleDirectoryError, toPeopleDataError } from "@/lib/people";
import type { PeopleDataset } from "@/types/person";

export const dynamic = "force-static";

function peopleDirectory(): string {
  return resolve(process.cwd(), "data/people");
}

// generateMetadata and the page body both need the dataset; cache() keeps that
// to a single read of the Markdown per request.
const loadDataset = cache(async (currentDate: ReturnType<typeof todayISO>) =>
  loadPeopleFromDirectory(peopleDirectory(), currentDate));

export async function generateMetadata(): Promise<Metadata> {
  try {
    const dataset = await loadDataset(todayISO());
    const count = dataset.people.filter((person) => person.type === "person").length;
    return { title: `Orbit — ${count} ${count === 1 ? "person" : "people"}` };
  } catch {
    // The page itself renders the real explanation; the tab just stays neutral.
    return { title: "Orbit" };
  }
}

export default async function Home() {
  const currentDate = todayISO();
  let dataset: PeopleDataset;

  try {
    dataset = await loadDataset(currentDate);
  } catch (error) {
    // A directory with no records is a first run, not broken data.
    if (error instanceof EmptyPeopleDirectoryError) {
      return <EmptyVaultView directory={error.directory} />;
    }
    return <DataErrorView error={toPeopleDataError(error)} />;
  }

  return <NetworkWorkspace initialDataset={dataset} currentDate={currentDate} />;
}
