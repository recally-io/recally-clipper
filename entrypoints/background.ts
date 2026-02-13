import { defineBackground } from "wxt/sandbox";
import { storage } from "wxt/storage";
import {
	type Article,
	type SaveBookmarkRequest,
	saveBookmark,
} from "~/utils/api";
import type { Settings } from "~/utils/types";

// ─── Existing bookmark/image handlers ────────────────────────────────

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
			tags: [],
		};

		await saveBookmark(settings, request);

		browser.runtime
			.sendMessage({
				type: "bookmark-saved",
				data: { url: tab.url },
			})
			.catch(() => {});
	} catch (error) {
		console.error("Error saving bookmark:", error);
		browser.runtime
			.sendMessage({
				type: "bookmark-error",
				error:
					error instanceof Error ? error.message : "Failed to save bookmark",
			})
			.catch(() => {});
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

		browser.runtime
			.sendMessage({
				type: "bookmark-saved",
				data: { url: info.srcUrl },
			})
			.catch(() => {});
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
			.catch(() => {});
	}
}

// ─── Twitter sync ────────────────────────────────────────────────────

interface TwitterTweet {
	id: string;
	text: string;
	author: string;
	screenName: string;
	createdAt: string;
	url: string;
}

interface TwitterSyncState {
	active: boolean;
	tabId: number | null;
	processedIds: Set<string>;
	syncCount: number;
	errorCount: number;
}

const twitterSync: TwitterSyncState = {
	active: false,
	tabId: null,
	processedIds: new Set(),
	syncCount: 0,
	errorCount: 0,
};

function safeSendMessage(message: Record<string, unknown>) {
	browser.runtime.sendMessage(message).catch(() => {});
}

function tweetToArticle(tweet: TwitterTweet): Article {
	return {
		title: `@${tweet.screenName}: ${tweet.text.slice(0, 80)}`,
		content: tweet.text,
		textContent: tweet.text,
		length: tweet.text.length,
		excerpt: tweet.text.slice(0, 280),
		byline: tweet.author,
		dir: "ltr",
		siteName: "X (Twitter)",
		lang: "",
		publishedTime: tweet.createdAt,
	};
}

function extractTweetsFromPayload(payload: unknown): TwitterTweet[] {
	if (!payload || typeof payload !== "object") return [];

	const data = (payload as Record<string, unknown>).data as
		| Record<string, unknown>
		| undefined;
	if (!data) return [];

	// Twitter uses different keys depending on the API version
	const timeline =
		(data.bookmark_timeline_v2 as Record<string, unknown>) ||
		(data.bookmark_timeline as Record<string, unknown>);
	const instructions =
		((timeline?.timeline as Record<string, unknown>)?.instructions as
			| Array<Record<string, unknown>>
			| undefined) || [];

	const tweets: TwitterTweet[] = [];

	for (const instruction of instructions) {
		const entries =
			(instruction?.entries as Array<Record<string, unknown>>) || [];

		for (const entry of entries) {
			try {
				// Navigate the nested structure to find tweet result
				const content = entry?.content as Record<string, unknown> | undefined;
				if (!content) continue;

				// Direct entry or module item
				const itemContent =
					(content.itemContent as Record<string, unknown>) ||
					((content.content as Record<string, unknown>)?.itemContent as Record<
						string,
						unknown
					>);
				if (!itemContent) continue;

				const tweetResults = itemContent.tweet_results as
					| Record<string, unknown>
					| undefined;
				if (!tweetResults) continue;

				const result = tweetResults.result as
					| Record<string, unknown>
					| undefined;
				if (!result) continue;

				// Handle tweet with tombstone or promoted content
				const tweetResult =
					result.__typename === "TweetWithVisibilityResults"
						? (result.tweet as Record<string, unknown>)
						: result;
				if (!tweetResult) continue;

				const legacy = tweetResult.legacy as
					| Record<string, unknown>
					| undefined;
				const restId = tweetResult.rest_id as string | undefined;

				// User info
				const core = tweetResult.core as Record<string, unknown> | undefined;
				const userResults =
					(core?.user_results as Record<string, unknown>) ||
					(core?.user as Record<string, unknown>);
				const userResult =
					(userResults?.result as Record<string, unknown>) || userResults;
				const userLegacy = userResult?.legacy as
					| Record<string, unknown>
					| undefined;

				const screenName = userLegacy?.screen_name as string | undefined;

				if (!legacy || !restId || !screenName) continue;

				tweets.push({
					id: restId,
					text: (legacy.full_text as string) || "",
					author: (userLegacy?.name as string) || screenName,
					screenName,
					createdAt: (legacy.created_at as string) || new Date().toISOString(),
					url: `https://x.com/${screenName}/status/${restId}`,
				});
			} catch {
				// Skip malformed entries
			}
		}
	}

	return tweets;
}

async function processTwitterPayload(payload: unknown) {
	if (!twitterSync.active) return;

	const settings = await storage.getItem<Settings>("local:settings");
	if (!settings?.apiKey || !settings?.host) {
		// Abort the entire sync — auto-scroll would otherwise keep running
		// and eventually report a false "complete" status
		stopTwitterSync("error");
		safeSendMessage({
			type: "twitter-sync-error",
			error: "Please configure host and API key in extension settings",
		});
		return;
	}

	// The payload from the injected script wraps data in { source, url, data }
	const innerPayload = (payload as Record<string, unknown>)?.data || payload;
	const tweets = extractTweetsFromPayload(innerPayload);

	for (const tweet of tweets) {
		if (twitterSync.processedIds.has(tweet.id)) continue;
		twitterSync.processedIds.add(tweet.id);

		const request: SaveBookmarkRequest = {
			type: "bookmark",
			url: tweet.url,
			article: tweetToArticle(tweet),
			markdownContent: tweet.text,
			tags: ["twitter-bookmark"],
		};

		try {
			await saveBookmark(settings, request);
			twitterSync.syncCount += 1;
			safeSendMessage({
				type: "twitter-sync-progress",
				data: {
					count: twitterSync.syncCount,
					errors: twitterSync.errorCount,
				},
			});
		} catch (error) {
			twitterSync.errorCount += 1;
			console.error("Failed to save twitter bookmark:", tweet.url, error);
		}
	}
}

function startTwitterSync() {
	twitterSync.active = true;
	twitterSync.processedIds.clear();
	twitterSync.syncCount = 0;
	twitterSync.errorCount = 0;

	browser.tabs.create({ url: "https://x.com/i/bookmarks" }).then((tab) => {
		if (tab.id) {
			twitterSync.tabId = tab.id;

			// Wait for the page to load before starting auto-scroll
			const onUpdated = (
				tabId: number,
				changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
			) => {
				if (tabId === tab.id && changeInfo.status === "complete") {
					browser.tabs.onUpdated.removeListener(onUpdated);
					// Small delay to let Twitter's SPA hydrate
					setTimeout(() => {
						if (twitterSync.tabId && twitterSync.active) {
							browser.tabs
								.sendMessage(twitterSync.tabId, {
									type: "twitter-start-auto-scroll",
								})
								.catch(() => {});
						}
					}, 3000);
				}
			};
			browser.tabs.onUpdated.addListener(onUpdated);
		}
	});
}

function stopTwitterSync(reason: "manual" | "done" | "error" = "manual") {
	twitterSync.active = false;

	if (twitterSync.tabId) {
		browser.tabs
			.sendMessage(twitterSync.tabId, {
				type: "twitter-stop-auto-scroll",
			})
			.catch(() => {});
	}

	// Emit different message types so the popup can distinguish
	// a successful full sync from a user-initiated early stop
	if (reason === "done") {
		safeSendMessage({
			type: "twitter-sync-complete",
			data: {
				count: twitterSync.syncCount,
				errors: twitterSync.errorCount,
			},
		});
	} else if (reason === "manual") {
		safeSendMessage({
			type: "twitter-sync-stopped",
			data: {
				count: twitterSync.syncCount,
				errors: twitterSync.errorCount,
			},
		});
	}
	// reason === "error" — the caller emits twitter-sync-error separately
}

// ─── Main ────────────────────────────────────────────────────────────

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

		// Handle messages from popup and content scripts
		browser.runtime.onMessage.addListener((message) => {
			if (!message?.type) return;

			switch (message.type) {
				case "start-twitter-sync":
					startTwitterSync();
					break;

				case "stop-twitter-sync":
					stopTwitterSync();
					break;

				case "get-twitter-sync-status":
					// Popup can request the current status on open
					safeSendMessage({
						type: "twitter-sync-status",
						data: {
							active: twitterSync.active,
							count: twitterSync.syncCount,
							errors: twitterSync.errorCount,
						},
					});
					break;

				case "twitter-graphql-response":
					processTwitterPayload(message.payload).catch((error) => {
						console.error("Error processing twitter payload:", error);
					});
					break;

				case "twitter-auto-scroll-done":
					// Auto-scroll finished — all bookmarks loaded
					stopTwitterSync("done");
					break;
			}
		});
	},
});
