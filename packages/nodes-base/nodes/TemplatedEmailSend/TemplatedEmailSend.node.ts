import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';
import Handlebars from 'handlebars';
import { createMimeMessage } from 'mimetext';

import htmlToFormattedText from 'html-to-formatted-text';

export class TemplatedEmailSend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Send Templated Email',
		name: 'TemplatedEmailSend',
		icon: 'fa:envelope',
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
			{
				name: 'smtp',
				required: false,
			},
			{
				name: 'azureSecret',
				required: false,
			},
		],
		properties: [
			// TODO: Add choice for text as text or html  (maybe also from name)
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: 'noreply@outdoorcap.com',
				required: true,
				placeholder: 'noreply@outdoorcap.com',
				description: 'Email address of the sender optional with name.',
			},
			{
				displayName: 'To Email',
				name: 'toEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'info@example.com',
				description: 'Email address of the recipient.',
			},
			{
				displayName: 'CC Email',
				name: 'ccEmail',
				type: 'string',
				default: '',
				placeholder: 'cc@example.com',
				description: 'Email address of CC recipient.',
			},
			{
				displayName: 'BCC Email',
				name: 'bccEmail',
				type: 'string',
				default: '',
				placeholder: 'bcc@example.com',
				description: 'Email address of BCC recipient.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'My subject line',
				description: 'Subject line of the email.',
			},
			{
				displayName: 'Send As HTML',
				name: 'sendAsHtml',
				type: 'boolean',
				default: false,
				description: 'Force send as HTML.',
			},
			{
				displayName: 'Template Data Source',
				name: 'templateDataSource',
				type: 'string',
				default: '',
				description: 'The data source to use for the template.',
			},
			{
				displayName: 'Use Dot Notation',
				name: 'useDotNotation',
				type: 'boolean',
				default: false,
				description: 'Use dot notation for the template data source.',
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
				description: 'Plain text message of email.',
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description: 'Name of the binary properties that contain data to add to email as attachment. Multiple ones can be comma-separated.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Ignore SSL Issues',
						name: 'allowUnauthorizedCerts',
						type: 'boolean',
						default: false,
						description: 'Do connect even if SSL certificate validation is not possible.',
					},
				],
			},
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

				const fromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
				const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
				const ccEmail = this.getNodeParameter('ccEmail', itemIndex) as string;
				const bccEmail = this.getNodeParameter('bccEmail', itemIndex) as string;
				const subject = this.getNodeParameter('subject', itemIndex) as string;
				const text = this.getNodeParameter('text', itemIndex) as string;
				const attachmentPropertyString = this.getNodeParameter('attachments', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
				const sendAsHtml = this.getNodeParameter('sendAsHtml', itemIndex) as boolean;
				const templateDataSource = this.getNodeParameter('templateDataSource', itemIndex) as string;
				const useDotNotation = this.getNodeParameter('useDotNotation', itemIndex) as boolean;



				const credentials = await this.getCredentials('smtp');

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

				// setup email data with unicode symbols

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

				const baseOptions = {
					from: fromEmail,
					to: toEmail,
					cc: ccEmail,
					bcc: bccEmail,
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

				// Send the email
				const info = await transporter.sendMail(mailOptions);

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
