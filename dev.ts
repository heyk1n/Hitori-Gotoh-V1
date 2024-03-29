const commandPaths: Record<string, string[]> = {
	chatInputs: [],
	messages: [],
};

for await (const dir of Deno.readDir("./commands")) {
	if (dir.isDirectory) {
		const category = dir.name;

		const folderPath = `./commands/${category}`;
		for await (const file of Deno.readDir(folderPath)) {
			if (file.isFile && !file.name.startsWith("_")) {
				const filePath = `${folderPath}/${file.name}`;

				switch (category) {
					case "chatInputs": {
						commandPaths.chatInputs.push(filePath);
						break;
					}
					case "messages": {
						commandPaths.messages.push(filePath);
						break;
					}
				}
			}
		}
	}
}

const manifest = `
${
	commandPaths.chatInputs.map((ctx, index) =>
		`import $${index} from "${ctx}";`
	)
		.join("\n")
}

${
	commandPaths.messages.map((ctx, index) =>
		`import $$${index} from "${ctx}";`
	)
		.join("\n")
}

const manifest = {
    commands: {
		chatInputs: [
			${
	commandPaths.chatInputs.map((_ctx, index) => `$${index}`).join(",\n")
}
		],
        messages: [
			${
	commandPaths.messages.map((_ctx, index) => `$$${index}`).join(",\n")
}
		]
    }
};

export default manifest;`;

const raw = new ReadableStream({
	start(cont) {
		cont.enqueue(new TextEncoder().encode(manifest));
		cont.close();
	},
});
const proc = new Deno.Command(Deno.execPath(), {
	args: ["fmt", "-"],
	stdin: "piped",
	stdout: "piped",
	stderr: "null",
}).spawn();

await raw.pipeTo(proc.stdin);
const { stdout } = await proc.output();

await Deno.writeTextFile("manifest.gen.ts", new TextDecoder().decode(stdout));
