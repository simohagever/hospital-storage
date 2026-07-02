import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type BomRow = {
  name: string;
  qty: number;
  placed: number;
  width: number;
  height: number;
  depth: number;
  params: string;
};

export function buildReport(options: {
  elevationPng: string;
  scene3dPng: string;
  configName: string;
  wallWidth: number;
  wallHeight: number;
  bom: BomRow[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Title block
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(options.configName, margin, margin + 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `Wall: ${options.wallWidth.toFixed(2)} m wide × ${options.wallHeight.toFixed(2)} m high`,
    margin,
    margin + 12,
  );
  doc.setTextColor(0);

  let cursorY = margin + 22;

  // ── 2D elevation ──────────────────────────────────────────────────────────
  if (options.elevationPng) {
    const elevProps = doc.getImageProperties(options.elevationPng);
    const elevAspect = elevProps.width / elevProps.height;
    const elevH = contentW / elevAspect;

    if (cursorY + elevH + 10 > pageH - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("2D Elevation", margin, cursorY);
    cursorY += 5;
    doc.addImage(options.elevationPng, "PNG", margin, cursorY, contentW, elevH, undefined, "MEDIUM");
    cursorY += elevH + 8;
  }

  // ── 3D snapshot ───────────────────────────────────────────────────────────
  if (options.scene3dPng) {
    const sceneProps = doc.getImageProperties(options.scene3dPng);
    const sceneAspect = sceneProps.width / sceneProps.height;
    // Cap height at 45% of usable page height so the BOM still fits on the same page
    const maxSceneH = (pageH - margin * 2) * 0.45;
    const sceneW = Math.min(contentW, maxSceneH * sceneAspect);
    const sceneH = sceneW / sceneAspect;

    if (cursorY + sceneH + 16 > pageH - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3D View", margin, cursorY);
    cursorY += 5;
    doc.addImage(options.scene3dPng, "PNG", margin, cursorY, sceneW, sceneH, undefined, "MEDIUM");
    cursorY += sceneH + 8;
  }

  // ── Bill of materials ─────────────────────────────────────────────────────
  if (cursorY + 30 > pageH - margin) {
    doc.addPage();
    cursorY = margin;
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill of Materials", margin, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    head: [["Product", "Qty", "Placed", "W (m)", "H (m)", "D (m)", "Parameters"]],
    body: options.bom.map((row) => [
      row.name,
      row.qty,
      row.placed,
      row.width.toFixed(3),
      row.height.toFixed(3),
      row.depth.toFixed(3),
      row.params,
    ]),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 244, 242] },
    margin: { left: margin, right: margin },
  });

  const safeFileName =
    options.configName
      .replace(/[^a-z0-9]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "report";
  doc.save(`${safeFileName}.pdf`);
}
