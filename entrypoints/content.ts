import { defineContentScript } from "wxt/sandbox";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

export default defineContentScript({
	matches: ["<all_urls>"],
	main() {
		// Initialize Turndown with default options
		const turndownService = new TurndownService();

		// Function to extract and process content
		function processPageContent() {
			try {
				// Clone document to avoid modifying the original
				const documentClone = document.cloneNode(true) as Document;

				// Use Readability to parse and extract content
				const reader = new Readability(documentClone);
				const article = reader.parse();

				if (!article) {
					throw new Error("Failed to extract article content");
				}

				// Convert cleaned HTML to Markdown
				const markdownContent = turndownService.turndown(article.content);

				// Send content to background script for API submission
				chrome.runtime.sendMessage({
					type: "content-processed",
					data: {
						title: article.title,
						content: markdownContent,
						url: window.location.href,
					},
				});
			} catch (error) {
				console.error("Error processing page content:", error);
				chrome.runtime.sendMessage({
					type: "content-error",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		// Listen for messages from background script
		chrome.runtime.onMessage.addListener((message) => {
			if (message.type === "process-content") {
				processPageContent();
			}
		});
	},
});
