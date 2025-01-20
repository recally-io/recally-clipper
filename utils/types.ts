export interface Position {
	x: number;
	y: number;
}

export interface Settings {
	host: string;
	apiKey: string;
}

export const defaultSettings: Settings = {
	host: "https://recally.io",
	apiKey: "",
};
