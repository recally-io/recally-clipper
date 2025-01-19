interface StorageData {
	host?: string;
	apiKey?: string;
}

export const storage = {
	get: async <T extends keyof StorageData>(key: T): Promise<StorageData[T]> => {
		const result = await chrome.storage.sync.get(key);
		return result[key];
	},

	set: async (data: StorageData): Promise<void> => {
		await chrome.storage.sync.set(data);
	},

	getAll: async (): Promise<StorageData> => {
		return await chrome.storage.sync.get(null);
	},
};
