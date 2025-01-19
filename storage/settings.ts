import { storage } from "wxt/storage";

export const hostItem = storage.defineItem<string>("sync:host", {
	fallback: "",
});

export const apiKeyItem = storage.defineItem<string>("sync:apiKey", {
	fallback: "",
});
