import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { sha256 } from "./hash";
import { SlovakInvoicePdfRenderer } from "./pdf-renderer";
import { createInvoicePdfFixture } from "./test-fixtures";

test("renderer vytvorí čitateľný a deterministický slovenský PDF doklad", async () => {
  const renderer = new SlovakInvoicePdfRenderer();
  const fixture = createInvoicePdfFixture();

  const first = await renderer.render(fixture);
  const second = await renderer.render(fixture);

  assert.equal(new TextDecoder().decode(first.slice(0, 5)), "%PDF-");
  assert.equal(sha256(first), sha256(second));

  const parsed = await PDFDocument.load(first);
  assert.equal(parsed.getPageCount(), 1);
  assert.equal(parsed.getTitle(), "Faktúra 2026009");
  assert.equal(parsed.getAuthor(), "Zdravý Shot, s. r. o.");
});

test("renderer zalomí dlhý doklad na viac strán", async () => {
  const fixture = createInvoicePdfFixture();
  const lines = Array.from({ length: 45 }, (_, index) => ({
    ...fixture.lines[0]!,
    lineNumber: index + 1,
    description: `Zázvorový shot s dlhším popisom položky ${index + 1}`,
  }));
  const renderer = new SlovakInvoicePdfRenderer();
  const bytes = await renderer.render({
    ...fixture,
    lines,
    totalNetCents: 450_000,
    totalVatCents: 103_500,
    totalGrossCents: 553_500,
  });

  const parsed = await PDFDocument.load(bytes);
  assert.ok(parsed.getPageCount() > 1);
});
