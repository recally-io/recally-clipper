export default defineBackground(() => {
	// Handle processed content from content script
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.type === "content-processed") {
			const { title, content, url } = message.data;

			console.log("Received processed content:", { title, content, url });

			// Send to Recally API
			fetch("https://recally.io/api/v1/bookmarks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title,
					content,
					url,
					source: "chrome-extension",
				}),
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error("Failed to save bookmark");
					}
					return response.json();
				})
				.then((data) => {
					console.log("Bookmark saved successfully:", data);
					// Send success response back to content script
					sendResponse({ success: true });
				})
				.catch((error) => {
					console.error("Error saving bookmark:", error);
					// Send error response back to content script
					sendResponse({ success: false, error: error.message });
				});

			// Return true to indicate we want to send a response asynchronously
			return true;
		}
	});
});
