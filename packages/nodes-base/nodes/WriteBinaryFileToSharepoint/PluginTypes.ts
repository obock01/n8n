import { IBinaryKeyData, IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

export type OptionType = string | undefined;
export type AnyType = {
	[key: string]: IDataObject | IBinaryKeyData | NodeApiError | NodeOperationError | undefined;
};
