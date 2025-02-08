import { defineBackground } from "wxt/sandbox";
import { storage } from "wxt/storage";
import iconUrl from "~/assets/icon.png";
import { type SaveBookmarkRequest, saveBookmark } from "~/utils/api";
import type { Settings } from "~/utils/types";

export default defineBackground({
	main() {
		// Create context menu item
		browser.contextMenus.create({
			id: "save-to-recally",
			title: "Save to Recally",
			contexts: ["page", "selection"],
		});

		// Handle context menu click
		browser.contextMenus.onClicked.addListener(async (info, tab) => {
			if (info.menuItemId === "save-to-recally" && tab?.id) {
				try {
					// Get settings
					const settings: Settings | null =
						await storage.getItem("local:settings");

					if (!settings?.apiKey) {
						throw new Error(
							"Please configure host and API key in extension settings",
						);
					}

					// Send message to content script to process the page
					const response = await browser.tabs.sendMessage(tab.id, {
						type: "process-content",
					});

					if (!response.success) {
						throw new Error(response.error);
					}

					// Save bookmark
					const request: SaveBookmarkRequest = {
						url: tab.url || "",
						article: response.article,
						markdownContent: response.markdown || "",
						tags: [], // Default to empty tags for context menu
					};
					console.log(settings);
					console.log(request);
					const saveResponse = await saveBookmark(settings, request);
					console.log(saveResponse);

					if (!saveResponse.ok) {
						const errorMessage = await saveResponse.text();
						throw new Error(`Failed to save to Recally: ${errorMessage}`);
					}

					// Show success notification
					await browser.notifications.create({
						type: "basic",
						iconUrl: iconUrl,
						title: "Recally Clipper",
						message: "Successfully saved to your library!",
					});
				} catch (error) {
					// Show error notification
					await browser.notifications.create({
						type: "basic",
						iconUrl: iconUrl,
						title: "Recally Clipper",
						message:
							error instanceof Error ? error.message : "Failed to save content",
					});
				}
			}
		});
	},
});
