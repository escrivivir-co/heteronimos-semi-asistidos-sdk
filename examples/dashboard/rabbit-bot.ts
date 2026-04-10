import * as fs from "node:fs";
import * as path from "node:path";
import { buildPluginHelpText, type BotPlugin, type CommandDefinition, type MenuDefinition } from "heteronimos-semi-asistidos-sdk";

const BROADCAST_FILE = "userdata/broadcast.md";
const HISTORY_DIR = "userdata/history";
const BROADCAST_TEMPLATE = `<!-- BROADCAST TEMPLATE -->
📡 @an_aleph_zero_rabit_23_bot

Escribe un bloque inicial corto: estado, destinatarios y por qué importa ahora.
Cada linea --- abre un mensaje nuevo en el broadcast real.
---
## Arquitectura activa

- 1 instancia de bot
- 3 plugins
- 1 linea clara sobre Rabbit, Spider y Horse
---
## Reparto real del trabajo

Resume en 3 lineas: Rabbit coordina, Spider federa, Horse conversa.
---
## Capa nueva: Scriptorium

Explica aqui la encapsulacion:
- BotHubSDK como runtime
- bot-hub-sdk como plugin del Scriptorium
- conexion de Rabbit, Spider y Horse al ecosistema
---
## Estado de implementacion

- rama
- spec
- dashboard
- enlaces minimos
---
## Siguiente paso para conectarnos

Pide la accion concreta: grupo compartido, formato INVITE, mock crypto o firma real.
`;

export interface GEvent {
	timestamp: Date,
	data: any
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
	private appDir: string;
	private broadcastFn: ((message: string) => Promise<void>) | null = null;

	constructor(solana?: string, appDir?: string) {
		this.solana = solana ?? '';
		this.appDir = appDir ?? '';
		this.cronos = 2;
		this.events = this.getNextFibonacciDates(new Date(), this.cronos);
	}

	setBroadcast(fn: (message: string) => Promise<void>) {
		this.broadcastFn = fn;
	}

	private readBroadcastFile(): string[] | null {
		if (!this.appDir) return null;
		const filePath = path.join(this.appDir, BROADCAST_FILE);
		try {
			if (!fs.existsSync(filePath)) return null;
			const raw = fs.readFileSync(filePath, "utf-8").trim();
			if (!raw) return null;
			if (raw.startsWith("<!-- BROADCAST TEMPLATE -->")) return null;
			const chunks = raw.split(/^---$/m).map(s => s.trim()).filter(Boolean);
			return chunks.length > 0 ? chunks : null;
		} catch {
			return null;
		}
	}

	private archiveBroadcast(): string | null {
		if (!this.appDir) return null;
		const filePath = path.join(this.appDir, BROADCAST_FILE);
		if (!fs.existsSync(filePath)) return null;
		const historyDir = path.join(this.appDir, HISTORY_DIR);
		fs.mkdirSync(historyDir, { recursive: true });
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const archived = path.join(historyDir, `broadcast-${ts}.md`);
		fs.renameSync(filePath, archived);
		fs.writeFileSync(filePath, BROADCAST_TEMPLATE, "utf-8");
		return path.basename(archived);
	}

	commands(): CommandDefinition[] {
		return [
			{
				command: "aleph",
				description: "Broadcast message from userdata/broadcast.md to all chats",
				buildText: async () => {
					const chunks = this.readBroadcastFile();
					if (!chunks) {
						return `⚠️ No broadcast file found. Create or edit ${BROADCAST_FILE} with the message to send.`;
					}
					if (!this.broadcastFn) {
						return `📄 ${BROADCAST_FILE} (${chunks.length} part(s)):\n\n${chunks[0]}\n\n⚠️ Broadcast not available (bot not fully initialized).`;
					}
					for (const chunk of chunks) {
						await this.broadcastFn(chunk);
					}
					const archived = this.archiveBroadcast();
					const suffix = archived ? ` — archived as ${archived}` : "";
					return `✅ Broadcast sent (${chunks.length} message(s)) to all registered chats${suffix}.`;
				},
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

	onMessage() {
		return `Next 23 holes! Join & sync! \n\t - ${this.initializeEvents().map(c => c.data.countdown).join('\n\t - ')}`;
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
