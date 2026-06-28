export async function GET() {
	return new Response(JSON.stringify({ status: 'ok' }), {
		headers: { 'content-type': 'application/json' },
	});
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({}));
	return new Response(JSON.stringify({ received: body || null }), {
		status: 201,
		headers: { 'content-type': 'application/json' },
	});
}
