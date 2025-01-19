import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
	matches: ["<all_urls>"],
	main() {
		// Initialize Turndown with default options
		const turndownService = new TurndownService();

		// Listen for messages and return processed content
		chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
			if (message.type === "process-content") {
				try {
					// Clone document to avoid modifying the original
					const documentClone = document.cloneNode(true) as Document;
					const reader = new Readability(documentClone);
					const article = reader.parse();

					if (!article) {
						throw new Error("Failed to extract article content");
					}

					// Convert cleaned HTML to Markdown
					const markdownContent = turndownService.turndown(article.content);
					console.log(article);
					const date: Date = new Date(article.publishedTime);
					console.log(date.toISOString().split("T")[0]);
					// Send response back to popup
					sendResponse({
						success: true,
						article: article,
						markdown: markdownContent,
					});
				} catch (error) {
					sendResponse({
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
				return true; // Required for async response
			}
		});
	},
});
