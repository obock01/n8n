import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MicrosoftOneDriveOAuth2Api implements ICredentialType {
	name = 'microsoftSharepointOAuth2ApiCert';
	extends = [
		'MicrosoftOAuth2ApiCert',
	];
	displayName = 'Microsoft Sharepoint Cert API';
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'https://graph.microsoft.com/.default',
		},
	];
}
