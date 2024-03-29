import { basename } from "$std/url/basename.ts";
import type { RawFile } from "../types.d.ts";

export async function resolveAttachment(
	url: string | URL,
): Promise<RawFile> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`[${response.status}: ${response.statusText}]: ${
				url instanceof URL ? url.toString() : url
			}`,
		);
	} else {
		const contentType = response.headers.get("content-type");
		const data = new Uint8Array(await response.arrayBuffer());
		const name = basename(url);

		if (!contentType) throw new Error(`[no-content-type]: ${url}`);

		return { contentType, data, name };
	}
}
