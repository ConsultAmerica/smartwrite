import { describe, expect, it } from "vitest";
import type { Document } from "../types";
import { filterAndSortDocuments } from "./documentList";

function doc(partial: Partial<Document> & Pick<Document, "id" | "title">): Document {
  return {
    content: "",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-07T12:00:00.000Z",
    ...partial,
  };
}

describe("document list actions", () => {
  const docs = [
    doc({
      id: 1,
      title: "Business Proposal",
      content: "We propose a partnership.",
      favorite: true,
      updated_at: "2026-10-07T18:00:00.000Z",
    }),
    doc({
      id: 2,
      title: "Resume Summary",
      content: "Built React apps.",
      updated_at: "2026-10-07T17:00:00.000Z",
    }),
    doc({
      id: 3,
      title: "Old notes",
      content: "archive",
      trashed: true,
      updated_at: "2026-07-21T00:00:00.000Z",
    }),
  ];

  it("searches title, type, and content", () => {
    const byTitle = filterAndSortDocuments(docs, {
      query: "proposal",
      filter: "all",
      sort: "newest",
    });
    expect(byTitle.map((d) => d.id)).toEqual([1]);

    const byContent = filterAndSortDocuments(docs, {
      query: "react",
      filter: "all",
      sort: "newest",
    });
    expect(byContent.map((d) => d.id)).toEqual([2]);
  });

  it("filters favorites and trash", () => {
    const favorites = filterAndSortDocuments(docs, {
      query: "",
      filter: "favorites",
      sort: "newest",
    });
    expect(favorites.map((d) => d.id)).toEqual([1]);

    const trash = filterAndSortDocuments(docs, {
      query: "",
      filter: "trash",
      sort: "newest",
    });
    expect(trash.map((d) => d.id)).toEqual([3]);
  });

  it("excludes trashed from all", () => {
    const all = filterAndSortDocuments(docs, {
      query: "",
      filter: "all",
      sort: "newest",
    });
    expect(all.every((d) => !d.trashed)).toBe(true);
    expect(all.map((d) => d.id)).toEqual([1, 2]);
  });
});
