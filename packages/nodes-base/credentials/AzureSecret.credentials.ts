import {
	ICredentialDataDecryptedObject, ICredentialTestRequest,
	ICredentialType, IHttpRequestOptions,
	INodeProperties
} from 'n8n-workflow';


export class AzureSecret implements ICredentialType {
	name = 'azureSecret';
	displayName = 'Azure Secret';
	// documentationUrl = 'azureSecret';
	icon = 'file:Azure.svg';
	properties: INodeProperties[] = [
		{
			displayName: 'Client Id',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Authorization Endpoint URL',
			name: 'authorizationEndpointUrl',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Token Endpoint URL',
			name: 'tokenEndpointUrl',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			required: true,
			default: 'https://graph.microsoft.com/.default',
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.method = 'POST';
		delete requestOptions.body;
		requestOptions.body = {
			grant_type: 'client_credentials',
			client_secret: credentials.clientSecret,
			client_id: credentials.clientId,
			scope: credentials.scope,
		};
		delete requestOptions.headers;
		return requestOptions;
	}
}
