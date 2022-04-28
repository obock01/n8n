import {
	IAuthenticateHeaderAuth,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class HttpHeaderAuthCustom implements ICredentialType {
	name = 'HttpHeaderAuthCustom';
	displayName = 'Custom Header Auth';
	documentationUrl = 'httpRequest';
	icon = 'node:n8n-nodes-base.httpRequest';
	properties: INodeProperties[] = [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',

		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '',
		},
	];
	authenticate = {
		type: 'headerAuth',
		properties: {
			name: '={{credentials.name}}',
			value: '={{credentials.value}}',
		},
	} as IAuthenticateHeaderAuth;
}
