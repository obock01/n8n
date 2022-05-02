import 'isomorphic-fetch';
import { AuthenticationProvider, Client, ClientOptions, LargeFileUploadTask, StreamUpload } from '@microsoft/microsoft-graph-client';
import { createReadStream, readFileSync, statSync } from 'fs';
import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';
import { AnyType, OptionType } from './PluginTypes';
import crypto from "crypto";

const scopes = [
	'https://graph.microsoft.com/.default',
	// 'https://microsoft.sharepoint-df.com/Sites.FullControl.All',
	// 'https://graph.microsoft.com/User.ReadWrite.All',
	// 'https://graph.microsoft.com/Mail.Send',
	// 'https://graph.microsoft.com/Files.ReadWrite.All',
];

type DLAuthenticationProviderOptions = {
	clientId: string;
	certThumbprint: string;
	privateKey: string;
	azureTenantId: string;
	privateKeyPass: string;
};

const dlAuthenticationProviderOptions: DLAuthenticationProviderOptions = {
	clientId: process.env.AZURE_APP_ID ?? '15304609-426d-4c9d-9263-a24f423f49b5',
	certThumbprint: process.env.CERT_THUMBPRINT ?? 'D0DD142EC0EDDBF5529CE7E5F306F31427E80DB8',
	azureTenantId: process.env.AZURE_TENANT_ID ?? '626fe8b4-730f-4b18-9ec6-ac8e5be6ddf6',
	privateKeyPass: 'Npx9995',
	privateKey: '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFLTBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQwwHAQIr586uwLaGXQCAggA\nMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBBzeKk1WkaaT+/KSkD7knc4BIIE\n0EvUsjWVo1qHQnWK+z/enBXmiCuFEFWyfMyXDGhrktPh83oO+TY2NWJZrDd75OY6\nNjGjZglyy53Jfz1j8AWCUhBZQyI2Q3KNIA1NpI5psiRHivtIBFd676OgI7t1D4jQ\n/l0YSrroQIms9LVHR8hySR3gX/Umf0QhlxlzhBykmmC0Pya0grM5sLdWje8mdHDF\nQn0i4o2n9wlxZp1pD5tKtKy4RcNKTynImSlt6qAY+J1PBcE2KvEbIr/Kg1uAa0YG\nkPY//6vbm9/ekJ1iGHTlArd9WyYUWrDQU467F4cPIGQm/CSjmPzjlHQdzLqXoyk7\nQmAUSwX/eQGoISpgDM/Q0Hy21c3IbiiZDFMhEq+1F4zKuqWR05efbJbiEqN9Ikxz\nnke1EXIIdC+8CERjG3kI4Q58Pe41iem/hNumLOZf+cBz7Vy3fEEpZLeVRPMq6Q7z\nmmKCmhMBgHs5C0/FJ8ARxT+eT+I0vLHS8kRT2AH+rOFqJ+QITcfkBFESZlG6mVSo\nrgz/xkGDOL/zOAER8YjuJYQNgTDpWuiueRtqXUT4CO7HSi1Ek9dtCrf+aghOj5D7\nQdjntMaeBVW9ENaJE2fV0D3rsZByLi3zkAY//nKxEnQV/Y7CQ+ZZceabWbZ9YMA/\nNgcFlrG3L2qoiSbNauOKdbYswBcXwTfI9k/rGdMnk1ZiO0t6yJCY76UgEJFzdMQO\nSS8/cXGEjNdpvkbutP+VJcxjDfOH9on/oWaSnRobeURgylH8ULro9/XDW00a4SPA\n29brc7pgG+jrFtxLqE/ImP5gHEhaiLUs+D76Q7Xk5CwbGC9SSvVEefhxOV9KsXs4\neuTq6AIxomHUlj0HbM20oCQOI4s31j7GoPKdV5lGwAIQC91IGGFQPCStCdKnJJLw\nkxtKDVQ379K8g7IKDPzmTD2XiANCDqXChusa5FQA5p+VqY0W/Y7NzXenfDb9V1EC\n5ofIKsVn2hPo4SBY0Ng6HXEdE5MJ9Oo7QuNA1xYrNVKvYGmfo8yS/QNsg9oGFE1b\nkEOOmBIqjrM447s/Kztm1Q6lFbkRV8Rc164popP31oIJi3AjUyXGstcZvjCraY4r\nOGZNvMWLv+6yaJ4I2j32HzVcYnxBt5hdCgStmK4Yq4oa/1WhEt1+lTSu/2rSFxSw\nyX0oSFO5exm9iAZ3lr30WuNfJ2BQpbkoEJzNX34QJ1LNUcp7kTlHHXcOYP5HNzB/\n9EnplSjmHKcP/3yotb39LFDxc7c8QW9L632iWPsYgdRY7hJNPTV0weUqATzpC4xz\nGX6zwVdJyDeQUwTy7Kqz1pZZrOV0yHo4OPARpPw1iWmG6TyjsmzmyvcQ625AJotg\nUJvJh5ctr3gDkjeU+fgpnOUaTtEWgIoWw/FPcrou6qk77oFXsiFiBifDDUoS++7/\nCDMv+Vcw1UrYqvo0cGt3m1+JHn00h34HxE9aQL8LEMLZB9NKjSX0NyJZsDr044O8\ngh9JLswuhZ7hkyOao7eqFkAoQqGodZlo51QfiCzxFW4ViZSEjgCMbWXtvHiUjKYl\nT+bO+QJyXoBgVVQHkV9nUlFHFte0mE0Mkl3zgYmvSgw3x6WR6xHiak0bkBvec80V\nR8Ps+heWx9mMEQMU3YgJ7wztx3fXe1BZduixYL3JHlLR\n-----END ENCRYPTED PRIVATE KEY-----',
};

export class DLAuthenticationProvider implements AuthenticationProvider {
	tokenrequest: any;
	cca: ConfidentialClientApplication;

	constructor(options?: DLAuthenticationProviderOptions) {
		const privateKeySource = options?.privateKey ?? dlAuthenticationProviderOptions.privateKey;
		const privateKeyObject = crypto.createPrivateKey({
			key: privateKeySource,
			passphrase: options?.privateKeyPass ?? dlAuthenticationProviderOptions.privateKeyPass, // enter your certificate passphrase here
			format: 'pem',
		});

		const privateKey = privateKeyObject.export({
			format: 'pem',
			type: 'pkcs8',
		});
		const config: Configuration = {
			auth: {
				clientId: options?.clientId ?? dlAuthenticationProviderOptions.clientId,
				authority: `https://login.microsoftonline.com/${options?.azureTenantId ?? dlAuthenticationProviderOptions.azureTenantId}`,
				clientCertificate: {
					thumbprint: options?.certThumbprint ?? dlAuthenticationProviderOptions.certThumbprint,
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
		};
		this.tokenrequest = {
			scopes,
		};
		this.cca = new ConfidentialClientApplication(config);
	}

	async getAccessToken(): Promise<string> {
		return new Promise((ok, fail) => {
			this.cca
				.acquireTokenByClientCredential(this.tokenrequest)
				.then(response => {
					if(response?.accessToken) {
						ok(response.accessToken);
					}
				})
				.catch(error => {
					fail(error);
				});
		});
	}
}

export class DlMSGraphClient {
	client: Client;

	constructor() {
		const clientOptions: ClientOptions = {
			defaultVersion: 'v1.0',
			debugLogging: true,
			authProvider: new DLAuthenticationProvider(),
		};
		this.client = Client.initWithMiddleware(clientOptions);
	}

	async get(url: string, stream = false) {
		try {
			if (stream) {
				const response = await this.client.api(url).getStream();
				return response;
			} else {
				const response = await this.client.api(url).get();
				return response;
			}
		} catch (error) {
			throw new Error(error);
		}
	}

	async post(url: string, body: any): Promise<any> {
		try {
			const response = await this.client.api(url).post(body);
			return response;
		} catch (error) {
			throw new Error(error);
		}
	}

	async put(url: string, body: any, stream = false): Promise<any> {
		try {
			if (stream) {
				const response = await this.client.api(url).putStream(body);
				return response;
			} else {
				const response = await this.client.api(url).put(body);
				return response;
			}
		} catch (error) {
			throw new Error(error);
		}
	}

	async addLargeFile(filepath: string, url: string, filename: string): Promise<any> {
		try {
			const payload = {
				item: {
					'@microsoft.graph.conflictBehavior': 'fail',
					name: filename,
				},
			};
			const stats = statSync(filepath);
			const totalsize = stats.size;
			const readStream = createReadStream(filepath);
			const fileObject = new StreamUpload(readStream, filename, totalsize);

			const uploadSession = await LargeFileUploadTask.createUploadSession(this.client, url, payload);
			const uploadTask = new LargeFileUploadTask(this.client, fileObject, uploadSession);
			const response = await uploadTask.upload();
			return response;
		} catch (error) {
			throw new Error(error);
		}
	}

	pathToFile(filepath: string, filename: string): File {
		// Create Buffer
		const buff = readFileSync(filepath);

		// Get File Stats
		const stats = statSync(filepath);

		// Convert Buffer to Blob
		let file: any = JSON.stringify({ blob: buff.toString('base64') });
		file = JSON.parse(file);

		const blob: any = Buffer.from((file as any).blob, 'base64');
		blob.lastModifiedDate = stats.mtime;
		blob.name = filename;
		return blob as File;
	}
}
