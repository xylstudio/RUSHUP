import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    const uploadMode = req.headers.get('x-upload-mode') || ''
    const buffer = await req.arrayBuffer()

    return NextResponse.json({
      ok: true,
      receivedBytes: buffer.byteLength,
      contentType,
      uploadMode,
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
