import type { Settings } from "./types";

export type Article = {
	/** article title */
	title: string;

	/** HTML string of processed article content */
	content: string;

	/** text content of the article, with all the HTML tags removed */
	textContent: string;

	/** length of an article, in characters */
	length: number;

	/** article description, or short excerpt from the content */
	excerpt: string;

	/** author metadata */
	byline: string;

	/** content direction */
	dir: string;

	/** name of the site */
	siteName: string;

	/** content language */
	lang: string;

	/** published time */
	publishedTime: string;
};

export type BookmarkMetadata = {
	author?: string;
	published_at?: string;
	description?: string;
	sitename?: string;

	image?: string;
};

export type Bookmark = {
	type: string;
	title: string;
	url: string;
	content?: string;
	html?: string;
	description?: string;
	tags?: string[];
	metadata?: BookmarkMetadata;
};

export type SaveBookmarkRequest = {
	type: "image" | "bookmark";
	url: string;
	article?: Article;
	markdownContent?: string;
	tags: string[];
};

export function buildBookmarkFromArticle(
	request: SaveBookmarkRequest,
): Bookmark {
	const article = request.article;
	if (!article) {
		throw new Error("Article is required");
	}
	return {
		title: article.title,
		url: request.url,
		content: request.markdownContent || "",
		html: article.content || "",
		description: article.excerpt,
		tags: request.tags,
		type: request.type,
		metadata: {
			author: article.byline,
			published_at: article.publishedTime,
			description: article.excerpt,
			sitename: article.siteName,
		},
	};
}

export async function saveBookmark(
	settings: Settings,
	request: SaveBookmarkRequest,
): Promise<{ success: boolean }> {
	const apiUrl = `${settings.host}/api/v1/bookmarks`;

	let payload: Bookmark;
	if (request.type === "image") {
		payload = {
			url: request.url,
			title: `Image ${new Date().toISOString()}`,
			type: "image",
			tags: request.tags || [],
		};
	} else {
		// Handle article type
		payload = buildBookmarkFromArticle(request);
	}

	const response = await fetch(apiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${settings.apiKey}`,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Failed to save bookmark: ${response.statusText}`);
	}

	return { success: true };
}
