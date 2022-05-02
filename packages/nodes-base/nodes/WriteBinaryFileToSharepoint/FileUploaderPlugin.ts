import { DlMSGraphClient } from './SharepointClient';
import { readFile, statSync } from 'fs';
import { basename } from 'path';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { AnyType, OptionType } from './PluginTypes';

function tmpFile(prefix: OptionType = undefined, suffix: OptionType = undefined, tmpdir: OptionType = undefined) {
	prefix = typeof prefix !== 'undefined' ? prefix : 'tmp.';
	suffix = typeof suffix !== 'undefined' ? suffix : '';
	tmpdir = tmpdir ? tmpdir : os.tmpdir();
	return path.join(tmpdir, prefix + crypto.randomBytes(16).toString('hex') + suffix);
}

export async function uploadFile(filePath: string, filename: OptionType = undefined) {
	const remoteFilename = filename ?? basename(filePath);
	const res = await _uploadFile(filePath, remoteFilename);
	return res;
}

export async function uploadStream(fileBuffer: Buffer, filename: string) {
	const tempFile = tmpFile();
	await fs.writeFile(tempFile, fileBuffer);
	const res = await _uploadFile(tempFile, filename);
	await fs.unlink(tempFile);
	return res;
}

async function _uploadFile(filePath: string, fileName: string) {
	const sharePointHost = 'outdoorcapco.sharepoint.com';
	const sharePointSiteAddress = '/sites/FactoryCommunications';
	const uploadDirectory = 'PukkaFTPStorage';
	try {
		// Graph Client
		const graph = new DlMSGraphClient();

		// File Information
		const fSize = await fs.stat(filePath);

		// Get SharePoint Information
		const sharePointUrl = `/sites/${sharePointHost}:${sharePointSiteAddress}`;
		const getSiteId: AnyType = await graph.get(sharePointUrl);

		// Create Folder
		const getRootIdUrl = `/sites/${getSiteId.id}/drive/root/`;
		const getRootId: AnyType = await graph.get(getRootIdUrl);

		// const drivePath = `/drives/${driveid}:/${fileName}`;

		// const drive = await graph.get(`/sites/${getSiteId.id}/drive`);
		// const listDrives = await graph.get(`/sites/${getSiteId.id}/drives`);
		// const listObject = await graph.get(`/sites/${getSiteId.id}/lists/${listName}`);
		// const listDrive = await graph.get(`/sites/${getSiteId.id}/drives/${listObject.id}`);
		// const children = await graph.get(`/sites/${getSiteId.id}/drive/root/children`);

		if (fSize.size / (1024 * 1024) < 4.096) {
			console.log('Small File Upload');

			// Use Upload Small File Method
			const smallUploadUrl = `/sites/${getSiteId.id}/drive/items/${getRootId.id}:/${uploadDirectory}/${fileName}:/content`;
			const writer = new Promise((resolve, reject) => {
				readFile(filePath, 'utf8', async (err, data) => {
					if (err) {
						console.error('Error Reading File');
						console.error(err);
						reject(err);
					} else {
						const smallFileUpload = await graph.put(smallUploadUrl, data);
						console.log(smallFileUpload);
						resolve(smallFileUpload);
					}
				});
			});
			const res = await writer;
			return res;
		} else {
			console.log('Large File Upload');
			// Use Upload Large File Method
			// based upon https://docs.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
			// Create a upload Session
			const largeFileUploadSessionUrl = `/sites/${getSiteId.id}/drive/items/${getRootId.id}:/${uploadDirectory}/${fileName}:/createUploadSession`;

			const largeFile = graph.pathToFile(filePath, fileName);
			const largeFileUpload = await graph.addLargeFile(filePath, largeFileUploadSessionUrl, fileName);
			console.log(largeFileUpload);
			return largeFileUpload;
		}
	} catch (error) {
		console.error('createDocument: An error occured');
		console.error(error);
		return undefined;
	}
}
