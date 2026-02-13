import { defineContentScript } from "wxt/sandbox";

const EVENT_NAME = "RecallyGraphQLResponse";

export default defineContentScript({
	matches: ["https://x.com/i/bookmarks*", "https://twitter.com/i/bookmarks*"],
	runAt: "document_start",
	main() {
		// Inject the fetch interceptor into the page's main world
		const script = document.createElement("script");
		script.src = browser.runtime.getURL("injected-interceptor.js");
		script.async = false;
		(document.head || document.documentElement).appendChild(script);
		script.onload = () => script.remove();

		// Forward captured GraphQL responses from injected script → background
		window.addEventListener(EVENT_NAME, (event: Event) => {
			const customEvent = event as CustomEvent;
			browser.runtime.sendMessage({
				type: "twitter-graphql-response",
				payload: customEvent.detail,
			});
		});

		// Listen for auto-scroll commands from background
		browser.runtime.onMessage.addListener((message) => {
			if (message?.type === "twitter-start-auto-scroll") {
				startAutoScroll();
			}
			if (message?.type === "twitter-stop-auto-scroll") {
				stopAutoScroll();
			}
		});
	},
});

let scrollInterval: ReturnType<typeof setInterval> | null = null;
let noNewContentCount = 0;
let lastScrollHeight = 0;

function startAutoScroll() {
	noNewContentCount = 0;
	lastScrollHeight = 0;

	// Clear any existing interval
	if (scrollInterval) clearInterval(scrollInterval);

	scrollInterval = setInterval(() => {
		const currentScrollHeight = document.documentElement.scrollHeight;

		// Scroll to the bottom
		window.scrollTo({
			top: currentScrollHeight,
			behavior: "smooth",
		});

		// Check if we got new content
		if (currentScrollHeight === lastScrollHeight) {
			noNewContentCount++;
		} else {
			noNewContentCount = 0;
		}
		lastScrollHeight = currentScrollHeight;

		// If no new content after ~10 consecutive checks (20 seconds), we're done
		if (noNewContentCount >= 10) {
			stopAutoScroll();
			browser.runtime.sendMessage({
				type: "twitter-auto-scroll-done",
			});
		}
	}, 2000);
}

function stopAutoScroll() {
	if (scrollInterval) {
		clearInterval(scrollInterval);
		scrollInterval = null;
	}
}
