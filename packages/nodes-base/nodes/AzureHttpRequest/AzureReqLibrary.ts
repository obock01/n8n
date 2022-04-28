import 'isomorphic-fetch';
import { AuthenticationProvider} from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';
import crypto from 'crypto';


const scopes = [
	'https://graph.microsoft.com/.default',
	// 'https://microsoft.sharepoint-df.com/Sites.FullControl.All',
	// 'https://graph.microsoft.com/User.ReadWrite.All',
	// 'https://graph.microsoft.com/Mail.Send',
	// 'https://graph.microsoft.com/Files.ReadWrite.All',
];
export interface TokenRequest {
	azureTenantId: string;
	azureAppId: string;
	certThumbPrint: string;
	certificateContents: string;
	certificatePassphrase: string;
}

export class DLAuthenticationProvider implements AuthenticationProvider {
	cca: ConfidentialClientApplication;
	tokenrequest: {
		scopes: string[];
	};

	constructor(tokenRequest: TokenRequest) {
		const privateKeyObject = crypto.createPrivateKey({
			key: tokenRequest.certificateContents,
			passphrase: tokenRequest.certificatePassphrase,
			format: 'pem',
		});
		const privateKey = privateKeyObject.export({
			format: 'pem',
			type: 'pkcs8',
		});
		this.tokenrequest = {
			scopes,
		};
		this.cca = new ConfidentialClientApplication(
			{
				auth: {
					clientId: tokenRequest.azureAppId,
					authority: `https://login.microsoftonline.com/${tokenRequest.azureTenantId}`,
					clientCertificate: {
						thumbprint: tokenRequest.certThumbPrint, // can be obtained when uploading certificate to Azure AD
						privateKey: privateKey?.toString(),
					},
				},
				system: {
					loggerOptions: {
						loggerCallback(loglevel, message, containsPii) {
							console.log(message);
						},
						piiLoggingEnabled: false,
						logLevel: LogLevel.Verbose,
					},
				},
			},
		);
	}
	async getAccessToken(): Promise<string> {
		return new Promise((ok, fail) => {
			this.cca
				.acquireTokenByClientCredential(this.tokenrequest)
				.then(response => {
					if(response?.accessToken) {
						ok(response.accessToken);
					}else {
						fail('Access token missing');
					}
				})
				.catch(error => {
					fail(error);
				});
		});
	}
}
