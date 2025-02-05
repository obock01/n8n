import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MicrosoftOAuth2ApiCert implements ICredentialType {
	name = 'microsoftOAuth2ApiCert';
	extends = [
		'oAuth2Api',
	];
	icon = 'file:Microsoft.svg';
	displayName = 'Microsoft OAuth2 API';
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		//info about the tenantID
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols#endpoints
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			default: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'response_mode=query',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
