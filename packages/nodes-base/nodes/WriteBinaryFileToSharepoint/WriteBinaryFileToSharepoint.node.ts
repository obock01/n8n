import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	writeFile as fsWriteFile,
} from 'fs/promises';
import { uploadStream } from './FileUploaderPlugin';


export class WriteBinaryFileToSharepoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Write Binary File to Sharepoint',
		name: 'writeBinaryFileToSharepoint',
		icon: 'file:Sharepoint.svg',
		group: ['output'],
		version: 1,
		description: 'Writes a binary file to disk',
		defaults: {
			name: 'Write Binary File to Sharepoint',
			color: '#CC2233',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Cert Thumb Print',
				name: 'certThumbPrint',
				type: 'string',
				default: 'D0DD142EC0EDDBF5529CE7E5F306F31427E80DB8',
				description: 'The certificate thumb print to use for authentication.',
			},
			{
				displayName: 'Azure App ID',
				name: 'azureAppId',
				type: 'string',
				default: '15304609-426d-4c9d-9263-a24f423f49b5',
				description: 'The Azure App ID to use for authentication.',
			},
			{
				displayName: 'Azure Tenant ID',
				name: 'azureTenantId',
				type: 'string',
				default: '626fe8b4-730f-4b18-9ec6-ac8e5be6ddf6',
				description: 'The Azure Tenant ID to use for authentication.',
			},
			{
				displayName: 'Certificate Contents',
				name: 'certificateContents',
				type: 'string',
				default: '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFLTBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQwwHAQIr586uwLaGXQCAggA\nMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBBzeKk1WkaaT+/KSkD7knc4BIIE\n0EvUsjWVo1qHQnWK+z/enBXmiCuFEFWyfMyXDGhrktPh83oO+TY2NWJZrDd75OY6\nNjGjZglyy53Jfz1j8AWCUhBZQyI2Q3KNIA1NpI5psiRHivtIBFd676OgI7t1D4jQ\n/l0YSrroQIms9LVHR8hySR3gX/Umf0QhlxlzhBykmmC0Pya0grM5sLdWje8mdHDF\nQn0i4o2n9wlxZp1pD5tKtKy4RcNKTynImSlt6qAY+J1PBcE2KvEbIr/Kg1uAa0YG\nkPY//6vbm9/ekJ1iGHTlArd9WyYUWrDQU467F4cPIGQm/CSjmPzjlHQdzLqXoyk7\nQmAUSwX/eQGoISpgDM/Q0Hy21c3IbiiZDFMhEq+1F4zKuqWR05efbJbiEqN9Ikxz\nnke1EXIIdC+8CERjG3kI4Q58Pe41iem/hNumLOZf+cBz7Vy3fEEpZLeVRPMq6Q7z\nmmKCmhMBgHs5C0/FJ8ARxT+eT+I0vLHS8kRT2AH+rOFqJ+QITcfkBFESZlG6mVSo\nrgz/xkGDOL/zOAER8YjuJYQNgTDpWuiueRtqXUT4CO7HSi1Ek9dtCrf+aghOj5D7\nQdjntMaeBVW9ENaJE2fV0D3rsZByLi3zkAY//nKxEnQV/Y7CQ+ZZceabWbZ9YMA/\nNgcFlrG3L2qoiSbNauOKdbYswBcXwTfI9k/rGdMnk1ZiO0t6yJCY76UgEJFzdMQO\nSS8/cXGEjNdpvkbutP+VJcxjDfOH9on/oWaSnRobeURgylH8ULro9/XDW00a4SPA\n29brc7pgG+jrFtxLqE/ImP5gHEhaiLUs+D76Q7Xk5CwbGC9SSvVEefhxOV9KsXs4\neuTq6AIxomHUlj0HbM20oCQOI4s31j7GoPKdV5lGwAIQC91IGGFQPCStCdKnJJLw\nkxtKDVQ379K8g7IKDPzmTD2XiANCDqXChusa5FQA5p+VqY0W/Y7NzXenfDb9V1EC\n5ofIKsVn2hPo4SBY0Ng6HXEdE5MJ9Oo7QuNA1xYrNVKvYGmfo8yS/QNsg9oGFE1b\nkEOOmBIqjrM447s/Kztm1Q6lFbkRV8Rc164popP31oIJi3AjUyXGstcZvjCraY4r\nOGZNvMWLv+6yaJ4I2j32HzVcYnxBt5hdCgStmK4Yq4oa/1WhEt1+lTSu/2rSFxSw\nyX0oSFO5exm9iAZ3lr30WuNfJ2BQpbkoEJzNX34QJ1LNUcp7kTlHHXcOYP5HNzB/\n9EnplSjmHKcP/3yotb39LFDxc7c8QW9L632iWPsYgdRY7hJNPTV0weUqATzpC4xz\nGX6zwVdJyDeQUwTy7Kqz1pZZrOV0yHo4OPARpPw1iWmG6TyjsmzmyvcQ625AJotg\nUJvJh5ctr3gDkjeU+fgpnOUaTtEWgIoWw/FPcrou6qk77oFXsiFiBifDDUoS++7/\nCDMv+Vcw1UrYqvo0cGt3m1+JHn00h34HxE9aQL8LEMLZB9NKjSX0NyJZsDr044O8\ngh9JLswuhZ7hkyOao7eqFkAoQqGodZlo51QfiCzxFW4ViZSEjgCMbWXtvHiUjKYl\nT+bO+QJyXoBgVVQHkV9nUlFHFte0mE0Mkl3zgYmvSgw3x6WR6xHiak0bkBvec80V\nR8Ps+heWx9mMEQMU3YgJ7wztx3fXe1BZduixYL3JHlLR\n-----END ENCRYPTED PRIVATE KEY-----',
				description: 'String contents of the certificate to use for authentication.',
			},
			{
				displayName: 'Certificate Passcode',
				name: 'certificatePassphrase',
				type: 'string',
				default: 'Npx9995',
				description: 'Decryption password',
			},
			{
				displayName: 'List Id',
				name: `listId`,
				type: 'string',
				default: '',
				required: true,
				placeholder: '',
				description: 'The ID of the list to write the file to',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'example.jpg',
				description: 'Path to which the file should be written.',
			},
			{
				displayName: 'Overwrite',
				name: 'overwrite',
				type: 'boolean',
				default: true,
				description: 'Whether to overwrite the file if it already exists.',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property which contains the data for the file to be written.',
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
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;

				const fileName = this.getNodeParameter('fileName', itemIndex) as string;

				item = items[itemIndex];

				if (item.binary === undefined) {
					throw new NodeOperationError(this.getNode(), 'No binary data set. So file can not be written!');
				}

				if (item.binary[dataPropertyName] === undefined) {
					throw new NodeOperationError(this.getNode(), `The binary property "${dataPropertyName}" does not exist. So no file can be written!`);
				}

				const newItem: INodeExecutionData = {
					json: {},
				};
				Object.assign(newItem.json, item.json);

				const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, dataPropertyName);

				const res = await uploadStream(binaryDataBuffer, fileName);

				if (item.binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					newItem.binary = {};
					Object.assign(newItem.binary, item.binary);
				}

				// Add the file name to data

				(newItem.json as IDataObject).fileName = fileName;

				(newItem.json as IDataObject) = {
					fileName,
					...res,
				};

				returnData.push(newItem);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}

}
