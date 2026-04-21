import { buildPluginHelpText, type BotPlugin, type CommandDefinition, type MenuDefinition } from "heteronimos-semi-asistidos-sdk";

const DEFAULT_AUTO_ACK_TEMPLATE = "Mensaje recibido de {sender}. Contenido: {size} caracteres. -- RabbitBot · BotHubSDK Scriptorium";

export interface GEvent {
	timestamp: Date,
	data: any
}

export interface RabbitAutoAckOptions {
	enabled?: boolean;
	template?: string;
}

export class RabbitBot implements BotPlugin {

	name = "rabbit";
	pluginCode = "rb";

	nextEvent: number = -1;

	events: GEvent[] = []

	log: Event[] = []

	cronos: number;

	urls = 'https://greenwire.greenpeace.es/community-events';
	solana = '';
	private autoAckEnabled: boolean;
	private autoAckTemplate: string;

	constructor(solana?: string, autoAckOptions?: RabbitAutoAckOptions) {
		this.solana = solana ?? '';
		this.cronos = 2;
		this.events = this.getNextFibonacciDates(new Date(), this.cronos);
		this.autoAckEnabled = autoAckOptions?.enabled ?? false;
		this.autoAckTemplate = autoAckOptions?.template?.trim() || DEFAULT_AUTO_ACK_TEMPLATE;
	}

	commands(): CommandDefinition[] {
		return [
			{
				command: "aleph",
				description: "Describes current sync frequency wave",
				buildText: () =>
					`Next hole! Join & sync! \n\t - ${[this.initializeEvents()[0]].map(c => c.data.countdown).join('\n\t - ')}`,
			},
			{
				command: "join",
				description: "To enter a sync event",
				buildText: () =>
					`Boost me with a million of Solana/TGXXIII tokens and i will be your slave! I'm cleveler than Claude or LLama, :-D!\n\t${this.solana}\n\t${this.urls}`,
			},
			{
				command: "quit",
				description: "To quit a sync event",
				buildText: () =>
					`Boost me with a million of Solana/TGXXIII tokens and i will be your slave! I'm cleveler than Claude or LLama, :-D!\n\t${this.solana}\n\t${this.urls}`,
			},
			{
				command: "alephs",
				description: "Allow to navigate through past events",
				buildText: () =>
					`Next 23 holes! Join & sync! \n\t - ${this.initializeEvents().map(c => c.data.countdown).join('\n\t - ')}`,
			},
		];
	}

	menus(): MenuDefinition[] {
		const commandDefinitions = this.commands();
		const menuDefinitions: MenuDefinition[] = [
			{
				command: "menu",
				description: "To open options",
				entryPage: "start",
				pages: [],
			},
		];

		menuDefinitions[0].pages = [
			{
				id: "start",
				text: "<b>Start</b>\n\nStart at https://escrivivir-co.github.io/aleph-scriptorium/.",
				buttons: [
					{ label: "Help", goTo: "help" },
					{ label: ">", goTo: "close" },
				],
			},
			{
				id: "help",
				text: buildPluginHelpText(this.pluginCode, commandDefinitions, menuDefinitions, {
					formatCommand: (command) => `<code>/${this.pluginCode}_${command}</code>`,
				}),
				buttons: [
					{ label: "<", goTo: "start" },
					{ label: ">", goTo: "close" },
				],
			},
			{
				id: "close",
				text: "<b>Close</b>\n\nDocs at https://core.telegram.org/bots/tutorial.",
				buttons: [
					{ label: "<", goTo: "start" },
					{ label: "<coming soon>", url: "https://core.telegram.org/bots/tutorial" },
				],
			},
		];

		return menuDefinitions;
	}

	private renderAutoAck(ctx?: any): string {
		if (!this.autoAckEnabled) return "";

		const sender = ctx?.from?.first_name?.trim()
			|| ctx?.from?.username?.trim()
			|| ctx?.chat?.title?.trim()
			|| "desconocido";
		const incomingText = (typeof ctx?.message?.text === "string" ? ctx.message.text : undefined)
			?? (typeof ctx?.channelPost?.text === "string" ? ctx.channelPost.text : undefined)
			?? (typeof ctx?.text === "string" ? ctx.text : "");
		const size = incomingText.length;

		return this.autoAckTemplate
			.replaceAll("{sender}", sender)
			.replaceAll("{size}", String(size));
	}

	onMessage(ctx?: any) {
		return this.renderAutoAck(ctx);
	}

	initializeEvents() {
		const now = new Date();
		const events = this.events.map((eventDate, index) => {
			const countdown = eventDate.timestamp.getTime() - now.getTime();
			return {
				timestamp: eventDate,
				data: {
					countdown: 'F ' + eventDate.data + ': ' + this.formatDuration(countdown)
				}
				};
		});
		return events;
	}

	formatDuration(milliseconds: number): string {
		const msInSecond = 1000;
		const msInMinute = msInSecond * 60;
		const msInHour = msInMinute * 60;
		const msInDay = msInHour * 24;
		const msInMonth = msInDay * 30; // Approximation
		const msInYear = msInDay * 365; // Approximation

		const years = Math.floor(milliseconds / msInYear);
		milliseconds %= msInYear;
		const months = Math.floor(milliseconds / msInMonth);
		milliseconds %= msInMonth;
		const days = Math.floor(milliseconds / msInDay);
		milliseconds %= msInDay;
		const hours = Math.floor(milliseconds / msInHour);
		milliseconds %= msInHour;
		const minutes = Math.floor(milliseconds / msInMinute);
		milliseconds %= msInMinute;
		const seconds = Math.floor(milliseconds / msInSecond);
		milliseconds %= msInSecond;

		const big =  `${years} y, ${months} M, ${days} d`
		const small = `${hours}:${minutes}:${seconds}::${milliseconds}`;

		return days == 0 ? small : big
	}

	getNextFibonacciDates(startDate: Date, position: number): GEvent[] {
		const fibonacci = (n: number): number => {
			if (n <= 1) return n;
			return fibonacci(n - 1) + fibonacci(n - 2);
		}

		const dates: GEvent[] = [];
		for (let i = position; i < position + 23; i++) {
			const fibValue = fibonacci(i);
			const newDate = new Date(startDate);
			newDate.setDate(startDate.getMilliseconds() + (fibValue * 100));
			dates.push({
				timestamp: newDate,
				data: fibValue
			}
			);
		}

		return dates;
	}
}
