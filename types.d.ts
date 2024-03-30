import {
	type API,
	type APIApplicationCommandInteraction,
	type APIChatInputApplicationCommandInteraction,
	type APIInteraction,
	type APIMessageApplicationCommandInteraction,
	type APIUserApplicationCommandInteraction,
	ApplicationCommandType,
	type RESTPostAPIApplicationCommandsJSONBody,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
	type Snowflake,
} from "@discordjs/core";
import type { Awaitable } from "@discordjs/util";

export interface ICommand<
	Data extends RESTPostAPIApplicationCommandsJSONBody,
	Interaction extends APIApplicationCommandInteraction,
> {
	data: Data;
	execute(
		options: InteractionExecuteOptions<Interaction>,
	): Awaitable<Response>;
}

export interface InteractionExecuteOptions<Interaction extends APIInteraction> {
	api: API;
	interaction: Interaction;
	kv: Deno.Kv;
}

export type ChatInput = ICommand<
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	APIChatInputApplicationCommandInteraction
>;
export type MessageContextMenu = ICommand<
	ContextMenuCommandData<ApplicationCommandType.Message>,
	APIMessageApplicationCommandInteraction
>;
export type UserContextMenu = ICommand<
	ContextMenuCommandData<ApplicationCommandType.User>,
	APIUserApplicationCommandInteraction
>;

export type Command =
	| ChatInput
	| MessageContextMenu
	| UserContextMenu;

type ContextMenuCommandData<
	T extends Exclude<ApplicationCommandType, ApplicationCommandType.ChatInput>,
> = Omit<RESTPostAPIContextMenuApplicationCommandsJSONBody, "type"> & {
	type: T;
};

export interface MessageReportOpen {
	isClosed: boolean;
	authorId: Snowflake;
	reportMessageId: Snowflake;
	voters?: Snowflake[];
}

export interface MessageReportClose extends MessageReportOpen {
	closedBy: Snowflake;
	reason: "warned" | "timeouted" | "false-report" | "kicked" | "banned";
}

export type MessageReport = MessageReportClose | MessageReportOpen;

export interface RawFile {
	name: string;
	contentType: string;
	data: Uint8Array;
}

export type ValidationResult =
	| { valid: false; error: string }
	| { valid: true; interaction: APIInteraction };
