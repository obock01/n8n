import Mail from 'nodemailer/lib/mailer';

export interface Message {
	subject?: string;
	body?: Body;
	from?: EmailAddresses;
	toRecipients?: EmailAddresses[];
	ccRecipients?: EmailAddresses[];
	bccRecipients?: EmailAddresses[];
	attachments?: Attachments[];
}

export interface Body {
	contentType?: string;
	content?: string;
}

export interface EmailAddress {
	address?: string;
	name?: string;
}

export interface EmailAddresses {
	emailAddress?: EmailAddress;
}

export interface Attachments {
	'@odata.type': string;
	name?: string;
	contentType?: string;
	contentBytes?: string;
}

function BuildEmailAddress(address: string | EmailAddress): EmailAddresses {
	return {
		emailAddress: {
			address: typeof address === 'string' ? address : address.address,
			name: typeof address === 'string' ? '' : address.name,
		},
	};
}

function NormalizeAttachments(mailOptions: Mail.Options) {
	return mailOptions.attachments?.map(attachment => {
		return {
			'@odata.type': '#microsoft.graph.fileAttachment',
			name: typeof attachment.filename === 'string' ? attachment.filename : '',
			contentType: attachment.contentType ?? '',
			contentBytes: attachment.content?.toString('base64') ?? '',
		};
	}) ?? [];
}
type AddressKeys = keyof Pick<Mail.Options, 'to' | 'cc' | 'bcc'>;

function NormalizeAddress<Key extends AddressKeys>(mailOptions: Mail.Options, addressType: Key): EmailAddresses[] | undefined {
	const addressField = mailOptions[addressType];
	if(Array.isArray(addressField)) {
		return addressField.map(addressObject => {
			if(typeof addressObject === 'string') {
				return BuildEmailAddress(addressObject);
			}else {
				return BuildEmailAddress(addressObject.address);
			}
		});
	} else {
		if(typeof addressField === 'string') {
			return [BuildEmailAddress(addressField)];
		}else {
			if(addressField?.address) {
				return [BuildEmailAddress(addressField.address)];
			}
		}
	}
}

export class MailGenerator {
	message?: Message;
	constructor(mailOptions: Mail.Options) {
		console.log('Mail Options for Mail Generator');
		console.log(JSON.stringify(mailOptions, null, 2));

		const fromAddress = typeof mailOptions.from === 'string' ? mailOptions.from : mailOptions.from?.address;

		this.message = {
			from: BuildEmailAddress(fromAddress ?? ''),
			toRecipients: NormalizeAddress(mailOptions, 'to'),
			ccRecipients: NormalizeAddress(mailOptions, 'cc'),
			bccRecipients: NormalizeAddress(mailOptions, 'bcc'),
			subject: mailOptions.subject ?? '',
			body: {
				contentType: mailOptions.html ? 'Html' : 'Text',
				content: mailOptions.html?.toString() ? mailOptions.html?.toString() : mailOptions.text?.toString(),
			},
			attachments: NormalizeAttachments(mailOptions),
		}
		;
	}

	addBody(contentType: string, content: string): void {
		if(this.message) {
			this.message.body = {
				contentType,
				content,
			};
		}
	}

	addAttachment(name: string, contentType: string, contentBytes: Buffer): void {
		if(this.message) {
			if(!Array.isArray(this.message.attachments)) {
				this.message.attachments = [];
			}
			this.message.attachments?.push({
				'@odata.type': '#microsoft.graph.fileAttachment',
				name,
				contentType,
				contentBytes: contentBytes.toString('base64'),
			});
		}
	}
	addSubject(subject: string): void {
		if(this.message) {
			this.message.subject = subject;
		}
	}
	toJson() {
		return JSON.stringify({
			message: this.message,
			saveToSentItems: false,
		});
	}
}
