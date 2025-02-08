import { defineBackground } from "wxt/sandbox";
import { storage } from "wxt/storage";
import { type SaveBookmarkRequest, saveBookmark } from "~/utils/api";
import type { Settings } from "~/utils/types";

async function handleContextMenuClick(
	info: browser.Menus.OnClickData,
	tab?: browser.Tabs.Tab,
) {
	if (info.menuItemId !== "save-to-recally" || !tab?.id) {
		return;
	}

	try {
		const settings = await storage.getItem<Settings>("local:settings");
		if (!settings?.apiKey || !settings?.host) {
			throw new Error(
				"Please configure host and API key in extension settings",
			);
		}

		// Send message to content script to process the page
		const response = await browser.tabs.sendMessage(tab.id, {
			type: "process-content",
		});

		if (!response?.success || !response.article || !response.markdown) {
			throw new Error("Failed to process page content");
		}

		const request: SaveBookmarkRequest = {
			type: "bookmark",
			url: tab.url || "",
			article: response.article,
			markdownContent: response.markdown,
			tags: [], // Default empty tags, can be modified later in popup
		};

		await saveBookmark(settings, request);

		// Notify popup if it's open
		browser.runtime
			.sendMessage({
				type: "bookmark-saved",
				data: { url: tab.url },
			})
			.catch(() => {
				// Ignore error if popup is not open
			});
	} catch (error) {
		console.error("Error saving bookmark:", error);
		// Notify popup of error if it's open
		browser.runtime
			.sendMessage({
				type: "bookmark-error",
				error:
					error instanceof Error ? error.message : "Failed to save bookmark",
			})
			.catch(() => {
				// Ignore error if popup is not open
			});
	}
}

async function handleImageContextMenuClick(
	info: browser.Menus.OnClickData,
	tab?: browser.Tabs.Tab,
) {
	if (info.menuItemId !== "save-image-to-recally" || !info.srcUrl) {
		return;
	}

	try {
		const settings = await storage.getItem<Settings>("local:settings");
		if (!settings?.apiKey || !settings?.host) {
			console.log("Please configure host and API key in extension settings");
			throw new Error(
				"Please configure host and API key in extension settings",
			);
		}

		const request: SaveBookmarkRequest = {
			type: "image",
			url: info.srcUrl,
			tags: [],
		};

		await saveBookmark(settings, request);

		// Notify popup if it's open
		browser.runtime
			.sendMessage({
				type: "bookmark-saved",
				data: { url: info.srcUrl },
			})
			.catch(() => {
				// Ignore error if popup is not open
			});
	} catch (error) {
		console.error("Error saving image bookmark:", error);
		browser.runtime
			.sendMessage({
				type: "bookmark-error",
				error:
					error instanceof Error
						? error.message
						: "Failed to save image bookmark",
			})
			.catch(() => {
				// Ignore error if popup is not open
			});
	}
}

export default defineBackground({
	main() {
		// Create context menu items
		browser.contextMenus.create({
			id: "save-to-recally",
			title: "Save to Recally",
			contexts: ["page", "selection"],
		});

		browser.contextMenus.create({
			id: "save-image-to-recally",
			title: "Save Image to Recally",
			contexts: ["image"],
		});

		// Handle context menu clicks
		browser.contextMenus.onClicked.addListener((info, tab) => {
			if (info.menuItemId === "save-to-recally") {
				handleContextMenuClick(info, tab);
			} else if (info.menuItemId === "save-image-to-recally") {
				handleImageContextMenuClick(info, tab);
			}
		});
	},
});
