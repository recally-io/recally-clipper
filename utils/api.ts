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
	title: string;
	url: string;
	content: string;
	html: string;
	description?: string;
	tags?: string[];
	metadata?: BookmarkMetadata;
};

export type SaveBookmarkRequest = {
	url: string;
	article: Article;
	markdownContent: string;
	tags: string[];
};

export async function saveBookmark(
	settings: Settings,
	request: SaveBookmarkRequest,
) {
	const article = request.article;
	const bookmark: Bookmark = {
		title: article.title,
		url: request.url,
		content: request.markdownContent,
		html: article.content || "",
		description: article.excerpt,
		tags: request.tags,
		metadata: {
			author: article.byline,
			published_at: article.publishedTime,
			description: article.excerpt,
			sitename: article.siteName,
		},
	};

	return await fetch(`${settings.host}/api/v1/bookmarks`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": settings.apiKey,
		},
		body: JSON.stringify(bookmark),
	});
}
