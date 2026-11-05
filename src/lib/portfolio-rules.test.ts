import { describe, expect, it } from "vitest";
import { bulkUnitLabels, canDeleteUnit, checkUpload, isSaPostalCode } from "./portfolio-rules";

const MB = 1024 * 1024;

describe("upload validation", () => {
  it("accepts a PDF document under 10 MB", () => {
    expect(checkUpload({ name: "title-deed.pdf", type: "application/pdf", size: 2 * MB }, "document")).toBeNull();
  });
  it("rejects documents over 10 MB", () => {
    expect(checkUpload({ name: "plans.pdf", type: "application/pdf", size: 10 * MB + 1 }, "document")).toBe("size");
  });
  it("rejects unsupported document types", () => {
    expect(checkUpload({ name: "notes.exe", type: "application/x-msdownload", size: 1000 }, "document")).toBe("type");
  });
  it("rejects PDFs as property photos", () => {
    expect(checkUpload({ name: "photo.pdf", type: "application/pdf", size: 1000 }, "photo")).toBe("type");
  });
  it("rejects photos over 5 MB", () => {
    expect(checkUpload({ name: "pool.jpg", type: "image/jpeg", size: 5 * MB + 1 }, "photo")).toBe("size");
  });
});

describe("SA postal code", () => {
  it("needs exactly four digits", () => {
    expect(isSaPostalCode("2196")).toBe(true);
    expect(isSaPostalCode("219")).toBe(false);
    expect(isSaPostalCode("21960")).toBe(false);
  });
});

describe("bulk unit labels", () => {
  it("numbers units from the start value", () => {
    expect(bulkUnitLabels({ prefix: "C", start: 301, count: 3 }).labels).toEqual(["C301", "C302", "C303"]);
  });
  it("skips labels that already exist", () => {
    const r = bulkUnitLabels({ prefix: "A", start: 101, count: 3 }, ["A102"]);
    expect(r.labels).toEqual(["A101", "A103"]);
    expect(r.clashes).toEqual(["A102"]);
  });
  it("zero-pads when asked", () => {
    expect(bulkUnitLabels({ prefix: "Room ", start: 1, count: 2, pad: 2 }).labels).toEqual(["Room 01", "Room 02"]);
  });
});

describe("unit deletion", () => {
  it("blocks deleting a unit with a tenant", () => {
    expect(canDeleteUnit({ tenantId: "t1", status: "occupied" })).toBe(false);
    expect(canDeleteUnit({ status: "vacant" })).toBe(true);
  });
});
