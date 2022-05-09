declare module 'mimetext' {

	type Recipient = string | {
		name: string;
		addr: string;
	};

	type HeaderObject = {
		key: string;
		value: string;
	}
	type Recipients = Recipient | Recipient[];


	type AnyOverride = {
		// tslint:disable-next-line:no-any
		[key: string]: any
	};

	type BodyType = 'text/plain' | 	'text/html';

	type GenericSetAddress = (val: Recipients) => MimeType;

	type MimeType = {
		setTo: GenericSetAddress;
		setCc: GenericSetAddress;
		setBcc: GenericSetAddress;
		setSender: GenericSetAddress;
		setRecipient: GenericSetAddress;
		setSubject: (subject: string) => MimeType;
		setMessage: (bodyType: BodyType, body: string, headers?: HeaderObject | HeaderObject[]) => MimeType;
		setHeader: (key: string, value: string) => MimeType;
		setAttachment: (filename: string, mimeType: string, content: string, headers?: HeaderObject | HeaderObject[]) => MimeType;
		asRaw: () => string;
		toBase64: () => string;
		toBase64WebSafe: () => string;
	};

	export function createMimeMessage(): AnyOverride;

}
