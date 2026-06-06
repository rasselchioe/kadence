import { NextResponse } from "next/server";
import { MAX_GPX_BYTES, parseGpx } from "@/lib/gpx/parse";
import { toPreview, type PreviewResponse } from "@/lib/gpx/preview";
import { GPX_ERROR_COPY, GpxError } from "@/lib/gpx/schema";

// Needs the Node runtime: Buffer, fast-xml-parser, and Turf.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stateless GPX preview. Parses an uploaded .gpx in-memory and returns the
 * analyzed ride as JSON — no auth, no storage, no database. This is the
 * pre-backend path that powers the upload page's drag-and-drop demo.
 */
export async function POST(
  req: Request,
): Promise<NextResponse<PreviewResponse>> {
  let file: FormDataEntryValue | null;
  try {
    const form = await req.formData();
    file = form.get("file");
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_XML", message: "Could not read the upload." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNSUPPORTED_MIME",
        message: GPX_ERROR_COPY.UNSUPPORTED_MIME,
      },
      { status: 400 },
    );
  }

  if (!/\.gpx$/i.test(file.name)) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNSUPPORTED_MIME",
        message: GPX_ERROR_COPY.UNSUPPORTED_MIME,
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_GPX_BYTES) {
    return NextResponse.json(
      { ok: false, code: "TOO_LARGE", message: GPX_ERROR_COPY.TOO_LARGE },
      { status: 413 },
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await parseGpx(buf);
    return NextResponse.json({ ok: true, ride: toPreview(parsed, file.name) });
  } catch (e) {
    if (e instanceof GpxError) {
      return NextResponse.json(
        { ok: false, code: e.code, message: e.message },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { ok: false, code: "INVALID_XML", message: GPX_ERROR_COPY.INVALID_XML },
      { status: 422 },
    );
  }
}
