import type {
	MessageContextMenu,
	MessageReportOpen,
	RawFile,
} from "../../types.d.ts";
import {
	type API,
	type APIActionRowComponent,
	type APIButtonComponent,
	type APIInteractionResponseChannelMessageWithSource,
	type APIInteractionResponseDeferredChannelMessageWithSource,
	type APIMessage,
	type APIMessageApplicationCommandInteraction,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	MessageType,
} from "@discordjs/core";
import { messageLink } from "@discordjs/formatters";
import { getAvatar, resolveAttachment } from "../../utils/mod.ts";

const command: MessageContextMenu = {
	data: {
		name: "Report",
		type: ApplicationCommandType.Message,
		dm_permission: false,
	},
	execute({ api, interaction, kv }) {
		const supportedMessageTypes = [
			MessageType.ChatInputCommand,
			MessageType.ContextMenuCommand,
			MessageType.Default,
			MessageType.Reply,
		];
		const message = Object.values(interaction.data.resolved.messages).at(
			0,
		)!;

		if (
			!supportedMessageTypes.some((supportedType) =>
				supportedType === message.type
			)
		) {
			const response: APIInteractionResponseChannelMessageWithSource = {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: `Tipe pesan yang kmu submit tidak valid.`,
				},
			};
			return Response.json(response);
		} else if (message.author.id === interaction.application_id) {
			const response: APIInteractionResponseChannelMessageWithSource = {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: "Kerja bagus.",
				},
			};
			return Response.json(response);
		} else {
			const response:
				APIInteractionResponseDeferredChannelMessageWithSource = {
					type: InteractionResponseType
						.DeferredChannelMessageWithSource,
					data: {
						flags: MessageFlags.Ephemeral,
					},
				};

			queueMicrotask(() => reportMessage(api, interaction, kv, message));
			return Response.json(response);
		}
	},
};

export default command;

async function reportMessage(
	api: API,
	interaction: APIMessageApplicationCommandInteraction,
	kv: Deno.Kv,
	message: APIMessage,
): Promise<void> {
	const reportWebhookId = Deno.env.get("DISCORD_REPORT_WEBHOOK_ID");
	const reportWebhookToken = Deno.env.get(
		"DISCORD_REPORT_WEBHOOK_TOKEN",
	);

	if (!reportWebhookId || !reportWebhookToken) {
		await api.interactions.editReply(
			interaction.application_id,
			interaction.token,
			{
				content:
					"Kayaknya moderator belum setup webhook untuk report nya nih 🌸",
			},
		);
	} else {
		const reportExpiration = 604_800_000;
		const reportId = [
			"reports",
			"messages",
			interaction.guild_id!,
			message.id,
		];
		const { value: reportData } = await kv.get<MessageReportOpen>(reportId);

		if (reportData) {
			await api.interactions.editReply(
				interaction.application_id,
				interaction.token,
				{ content: `Seseorang sudah melaporkan pesan ini.` },
			);
		} else {
			const atomic = kv.atomic();
			const messageUrl = messageLink(
				message.channel_id,
				message.id,
				interaction.guild_id!,
			);

			const row: APIActionRowComponent<APIButtonComponent> = {
				components: [{
					type: ComponentType.Button,
					style: ButtonStyle.Link,
					label: "Jump to message",
					url: messageUrl,
				}],
				type: ComponentType.ActionRow,
			};

			const files: RawFile[] = [];

			const sticker = message.sticker_items?.at(0);
			if (sticker) {
				// TODO(@heyk1n): handle sticker attachment
				files.push(
					await resolveAttachment(api.rest.cdn.sticker(sticker.id)),
				);
			} else {
				for (const attachment of message.attachments) {
					files.push(await resolveAttachment(attachment.url));
				}

				const reportWebhook = await api.webhooks.execute(
					reportWebhookId,
					reportWebhookToken,
					{
						content: message.content,
						files,
						username: message.author.username,
						avatar_url: getAvatar(api.rest.cdn, message.author),
						components: [row],
						wait: true,
					},
				);

				const newReportData: MessageReportOpen = {
					isClosed: false,
					authorId: interaction.member!.user.id,
					reportMessageId: reportWebhook.id,
					voters: [],
				};

				atomic.set(reportId, newReportData, {
					expireIn: reportExpiration,
				});
				await atomic.commit();

				await api.interactions.editReply(
					interaction.application_id,
					interaction.token,
					{
						content:
							`Laporan kamu telah dikirim ke moderator, terimakasih ya!!`,
					},
				);
			}
		}
	}
}
