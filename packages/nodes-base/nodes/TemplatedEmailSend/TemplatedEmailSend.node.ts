import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, IHttpRequestOptions, INodeExecutionData, INodeType, INodeTypeDescription } from "n8n-workflow";
import qs from 'qs';
import { createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';
import Handlebars from 'handlebars';
import {MailGenerator} from './MailGenerator';
import htmlToFormattedText from 'html-to-formatted-text';

async function GetSmtpCreds(node: IExecuteFunctions) {
	const c = await node.getCredentials('smtp');
	if(c?.user) {
		return c;
	}
	return undefined;
}
async function GetAzureCreds(node: IExecuteFunctions): Promise<string | undefined> {
	const c = await node.getCredentials('azureSecret');
	if(typeof c?.clientId === 'undefined') {
		console.log('No Azure credentials found');
		return undefined;
	}
	const cc = {
		clientId: c?.clientId ? `${c.clientId}` : '',
		clientSecret: c?.clientSecret ? `${c.clientSecret}` : '',
		authorizationEndpointUrl: c?.authorizationEndpointUrl ? `${c.authorizationEndpointUrl}`  : '',
		tokenEndpointUrl: c?.tokenEndpointUrl  ? `${c.tokenEndpointUrl}`  : '',
		scope: c?.scope ? `${c.scope}` : '',
	};
	if(cc.clientId === '' || cc.clientSecret === '' || cc.scope === '') return undefined;

	const data = qs.stringify({
		'grant_type': 'client_credentials',
		'client_id': cc.clientId,
		'client_secret': cc.clientSecret,
		'scope': cc.scope,
	});

	const options: IHttpRequestOptions = {
		url: cc.tokenEndpointUrl,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Accept': 'application/json',
		},
		body: data,
	};

	try {
		const authToken = await node.helpers.httpRequest(options);

		if(typeof authToken?.access_token !== 'undefined') {
			return authToken.access_token;
		}else {
			console.log('Didn\'t get auth token!');
			return undefined;
		}
	} catch (err) {
		console.log('Error getting auth token');
		console.log(err);
		return undefined;
	}
}
async function SendEmailAzure(node: IExecuteFunctions, itemIndex: number, mailOptions: Mail.Options) {
	const credentials = await GetAzureCreds(node);
	const sendAsUser = await node.getNodeParameter('sendAsUser', itemIndex) as string;
	const fromAddress = typeof mailOptions.from === 'string' ? mailOptions.from : mailOptions.from?.address;

	if(typeof credentials !== 'undefined') {
		const mailer = new MailGenerator(mailOptions);
		const sendAs = sendAsUser ?? fromAddress;
		const bodyContent = mailer.toJson();
		const requestUrl = `https://graph.microsoft.com/v1.0/users/${sendAs}/sendMail`;

		console.log('Generated Email Body:');
		console.log(bodyContent);

		const options: IHttpRequestOptions = {
			url: requestUrl,
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${credentials}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: bodyContent,
		};

		try {
			const response = await node.helpers.httpRequest(options);

			console.log('Response:');
			console.log(response);

			return response;
		} catch (err) {
			console.log('Error sending email');
			console.log(err);
		}
	}
}
async function SendEmailSmtp(node: IExecuteFunctions, itemIndex: number, mailOptions: Mail.Options) {
	const options = node.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const credentials = await GetSmtpCreds(node);
	if(typeof credentials === 'undefined') return {};

	const connectionOptions: SMTPTransport.Options = {
		host: credentials.host as string,
		port: credentials.port as number,
		secure: credentials.secure as boolean,
	};

	if (credentials.user || credentials.password) {
		// @ts-ignore
		connectionOptions.auth = {
			user: credentials.user as string,
			pass: credentials.password as string,
		};
	}

	if (options.allowUnauthorizedCerts === true) {
		connectionOptions.tls = {
			rejectUnauthorized: false,
		};
	}

	const transporter = createTransport(connectionOptions);
	return await transporter.sendMail(mailOptions);
}

async function IsAzure(node: IExecuteFunctions): Promise<boolean> {
	const credentials = await node.getCredentials('azureSecret');
	return typeof credentials?.clientId !== 'undefined';
}


export class TemplatedEmailSend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Send Templated Email',
		name: 'TemplatedEmailSend',
		icon: 'file:templatedEmail.svg',
		group: ['output'],
		version: 1,
		description: 'Sends a Templated Email',
		defaults: {
			name: 'Send Templated Email',
			color: '#00bb88',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			// {
			// 	name: 'smtp',
			// 	required: false,
			// },
			{
				name: 'azureSecret',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Send As User',
				name: 'sendAsUser',
				type: 'string',
				required: true,
				default: 'xeroxscan@outdoorcap.com',
				description: 'The email address of the user to impersonate',
			},
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: 'noreply@outdoorcap.com',
				required: true,
				placeholder: 'noreply@outdoorcap.com',
				description: 'Email address of the sender',
			},
			{
				displayName: 'From Name',
				name: 'fromName',
				type: 'string',
				default: 'Outdoor Cap',
				placeholder: 'From Name',
				description: 'Name of the sender',
			},
			{
				displayName: 'To Email',
				name: 'toEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'info@example.com',
				description: 'Email address of the recipient',
			},
			{
				displayName: 'CC Email',
				name: 'ccEmail',
				type: 'string',
				default: '',
				placeholder: 'cc@example.com',
				description: 'Email address of CC recipient',
			},
			{
				displayName: 'BCC Email',
				name: 'bccEmail',
				type: 'string',
				default: '',
				placeholder: 'bcc@example.com',
				description: 'Email address of BCC recipient',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'My subject line',
				description: 'Subject line of the email',
			},
			{
				displayName: 'Send As HTML',
				name: 'sendAsHtml',
				type: 'boolean',
				default: false,
				description: 'Force send as HTML',
			},
			{
				displayName: 'Template Data Source',
				name: 'templateDataSource',
				type: 'string',
				default: '',
				description: 'The data source to use for the template',
			},
			{
				displayName: 'Use Dot Notation',
				name: 'useDotNotation',
				type: 'boolean',
				default: false,
				description: 'Use dot notation for the template data source',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 10,
				},
				default: '',
				description: 'Plain text message of email',
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description: 'Name of the binary properties that contain data to add to email as attachment. Multiple ones can be comma-separated.',
			},
			// {
			// 	displayName: 'Options',
			// 	name: 'options',
			// 	type: 'collection',
			// 	placeholder: 'Add Option',
			// 	default: {},
			// 	options: [
			// 		{
			// 			displayName: 'Ignore SSL Issues',
			// 			name: 'allowUnauthorizedCerts',
			// 			type: 'boolean',
			// 			default: false,
			// 			description: 'Whether to connect even if SSL certificate validation is not possible',
			// 		},
			// 	],
			// },
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {

				item = items[itemIndex];

				const fromEmail = this.getNodeParameter('fromEmail', itemIndex, '') as string;
				const fromName = this.getNodeParameter('fromName', itemIndex, '') as string;
				const toEmail = this.getNodeParameter('toEmail', itemIndex, '') as string;
				const ccEmail = this.getNodeParameter('ccEmail', itemIndex, '') as string;
				const bccEmail = this.getNodeParameter('bccEmail', itemIndex, '') as string;
				const subject = this.getNodeParameter('subject', itemIndex) as string;
				const text = this.getNodeParameter('text', itemIndex) as string;
				const attachmentPropertyString = this.getNodeParameter('attachments', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
				const sendAsHtml = this.getNodeParameter('sendAsHtml', itemIndex) as boolean;
				const templateDataSource = this.getNodeParameter('templateDataSource', itemIndex) as string;
				const useDotNotation = this.getNodeParameter('useDotNotation', itemIndex) as boolean;






				const template = Handlebars.compile(text);
				function getTemplateData() {
					// tslint:disable-next-line:no-any
					let container = item.json as any;
					const templateDataSrc = templateDataSource?.trim() ?? '';

					if(templateDataSrc?.length > 0) {
						if(useDotNotation) {
							templateDataSrc.split('.').forEach(key => {
								container = container[key];
							});
							return container;
						}else {
							return container[templateDataSrc];
						}
					}else {
						return container;
					}
				}
				const templateData = getTemplateData();
				const emailText = template(templateData);

				type optionsType = Mail.Options;
				type addressType = optionsType['from'];
				type toType = optionsType['to'];

				const fromProp:addressType = (typeof fromName !== 'undefined' && fromName.length > 0) ? {name: fromName, address: fromEmail} : fromEmail;

				const toProp: toType = toEmail.split(',')
					.filter(e => e?.trim()?.length > 0)
					.map(email => {
						return {
							address: email.toLowerCase().trim(),
							name: '',
						};
					});

				const ccProp: toType = ccEmail.split(',')
					.filter(e => e?.trim()?.length > 0)
					.map(email => {
						return {
							address: email.toLowerCase().trim(),
							name: '',
						};
					});

				const bccProp: toType = bccEmail.split(',')
					.filter(e => e?.trim()?.length > 0)
					.map(email => {
						return {
							address: email.toLowerCase().trim(),
							name: '',
						};
					});

				const baseOptions: Pick<Mail.Options, 'from' | 'to' | 'cc' | 'bcc' | 'subject'> = {
					from: fromProp,
					to: toProp,
					cc: ccProp,
					bcc: bccProp,
					subject,
				};

				const mailOptions: Mail.Options = {
					...baseOptions,
					text: sendAsHtml ? htmlToFormattedText(emailText) : emailText,
					html: emailText,
				};


				if (attachmentPropertyString && item.binary) {
					const attachments = [];
					const attachmentProperties: string[] = attachmentPropertyString.split(',').map((propertyName) => {
						return propertyName.trim();
					});

					for (const propertyName of attachmentProperties) {
						if (!item.binary.hasOwnProperty(propertyName)) {
							continue;
						}
						attachments.push({
							filename: item.binary[propertyName].fileName || 'unknown',
							content: await this.helpers.getBinaryDataBuffer(itemIndex, propertyName),
						});
					}

					if (attachments.length) {
						// @ts-ignore
						mailOptions.attachments = attachments;
					}
				}
				// const isAzure = await IsAzure(this);
				// const info = isAzure ? (await SendEmailAzure(this, itemIndex, options)) : (await SendEmailSmtp(this, itemIndex, options));

				const info = await SendEmailAzure(this, itemIndex, mailOptions);

				returnData.push({ json: info as unknown as IDataObject });
			}catch (error) {
				if (this.continueOnFail()) {
					returnData.push({json:{ error: error.message }});
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}

}
