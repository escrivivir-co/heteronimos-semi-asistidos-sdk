import * as fs from "node:fs";
import * as path from "node:path";
import { buildPluginHelpText, type BotPlugin, type CommandDefinition, type MenuDefinition } from "heteronimos-semi-asistidos-sdk";

const BROADCAST_FILE = "userdata/broadcast.md";
const HISTORY_DIR = "userdata/history";
const SUMMARY_FILE = "userdata/summary.md";
const SUMMARY_HISTORY_DIR = "userdata/summary-history";
const DEFAULT_AUTO_ACK_TEMPLATE = "Mensaje recibido de {sender}. Contenido: {size} caracteres. -- RabbitBot · BotHubSDK Scriptorium";
const BROADCAST_TEMPLATE_MARKER = "<!-- BROADCAST TEMPLATE -->";
const SUMMARY_TEMPLATE_MARKER = "<!-- SUMMARY TEMPLATE -->";
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
const SUMMARY_TEMPLATE = `<!-- SUMMARY TEMPLATE -->
🧾 @an_aleph_zero_rabit_23_bot

Resume userdata/history/ en un mensaje transmisible por rb_alephs.
Cada linea --- abre un mensaje nuevo en el summary broadcast.
Piensa en 3-5 chunks, evita repetir datos y enlaza a GitHub cuando un punto ya exista en el repo.
---
## Estado sintetico

- que ha cambiado
- que sigue operativo
- que debe mirar el receptor primero
---
## Evidencia DRY

- carpeta history
- enlaces github.com a piezas clave
- no repetir bloques largos ya archivados
---
## Siguiente paso

- accion concreta esperada
- canal o dossier al que mover la conversacion
`;

interface QueuedMessageSpec {
	file: string;
	historyDir: string;
	historyPrefix: string;
	templateMarker: string;
	template: string;
	missingMessage: string;
	successMessage: string;
	unavailableMessage: string;
}

const BROADCAST_SPEC: QueuedMessageSpec = {
	file: BROADCAST_FILE,
	historyDir: HISTORY_DIR,
	historyPrefix: "broadcast",
	templateMarker: BROADCAST_TEMPLATE_MARKER,
	template: BROADCAST_TEMPLATE,
	missingMessage: `⚠️ No broadcast file found. Create or edit ${BROADCAST_FILE} with the message to send.`,
	successMessage: "✅ Broadcast sent",
	unavailableMessage: "⚠️ Broadcast not available (bot not fully initialized).",
};

const SUMMARY_SPEC: QueuedMessageSpec = {
	file: SUMMARY_FILE,
	historyDir: SUMMARY_HISTORY_DIR,
	historyPrefix: "summary",
	templateMarker: SUMMARY_TEMPLATE_MARKER,
	template: SUMMARY_TEMPLATE,
	missingMessage: `⚠️ No summary file found. Create or edit ${SUMMARY_FILE} with the summary to send.`,
	successMessage: "✅ Summary broadcast sent",
	unavailableMessage: "⚠️ Summary broadcast not available (bot not fully initialized).",
};

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
	private appDir: string;
	private broadcastFn: ((message: string) => Promise<void>) | null = null;
	private autoAckEnabled: boolean;
	private autoAckTemplate: string;

	constructor(solana?: string, appDir?: string, autoAckOptions?: RabbitAutoAckOptions) {
		this.solana = solana ?? '';
		this.appDir = appDir ?? '';
		this.cronos = 2;
		this.events = this.getNextFibonacciDates(new Date(), this.cronos);
		this.autoAckEnabled = autoAckOptions?.enabled ?? false;
		this.autoAckTemplate = autoAckOptions?.template?.trim() || DEFAULT_AUTO_ACK_TEMPLATE;
	}

	setBroadcast(fn: (message: string) => Promise<void>) {
		this.broadcastFn = fn;
	}

	private readQueuedMessageFile(spec: QueuedMessageSpec): string[] | null {
		if (!this.appDir) return null;
		const filePath = path.join(this.appDir, spec.file);
		try {
			if (!fs.existsSync(filePath)) return null;
			const raw = fs.readFileSync(filePath, "utf-8").trim();
			if (!raw) return null;
			if (raw.startsWith(spec.templateMarker)) return null;
			const chunks = raw.split(/^---$/m).map(s => s.trim()).filter(Boolean);
			return chunks.length > 0 ? chunks : null;
		} catch {
			return null;
		}
	}

	private archiveQueuedMessage(spec: QueuedMessageSpec): string | null {
		if (!this.appDir) return null;
		const filePath = path.join(this.appDir, spec.file);
		if (!fs.existsSync(filePath)) return null;
		const historyDir = path.join(this.appDir, spec.historyDir);
		fs.mkdirSync(historyDir, { recursive: true });
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const archived = path.join(historyDir, `${spec.historyPrefix}-${ts}.md`);
		fs.renameSync(filePath, archived);
		fs.writeFileSync(filePath, spec.template, "utf-8");
		return path.basename(archived);
	}

	private async dispatchQueuedMessage(spec: QueuedMessageSpec): Promise<string> {
		const chunks = this.readQueuedMessageFile(spec);
		if (!chunks) return spec.missingMessage;
		if (!this.broadcastFn) {
			return `📄 ${spec.file} (${chunks.length} part(s)):\n\n${chunks[0]}\n\n${spec.unavailableMessage}`;
		}
		for (const chunk of chunks) {
			await this.broadcastFn(chunk);
		}
		const archived = this.archiveQueuedMessage(spec);
		const suffix = archived ? ` — archived as ${archived}` : "";
		return `${spec.successMessage} (${chunks.length} message(s)) to all registered chats${suffix}.`;
	}

	commands(): CommandDefinition[] {
		return [
			{
				command: "aleph",
				description: "Broadcast message from userdata/broadcast.md to all chats",
				buildText: async () => this.dispatchQueuedMessage(BROADCAST_SPEC),
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
				description: "Broadcast summary from userdata/summary.md to all chats",
				buildText: async () => this.dispatchQueuedMessage(SUMMARY_SPEC),
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
