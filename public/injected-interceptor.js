(() => {
	const EVENT_NAME = "RecallyGraphQLResponse";

	const isTwitterBookmarksRequest = (url) => {
		if (typeof url !== "string") return false;
		return (
			url.includes("/i/api/graphql/") &&
			(url.includes("/Bookmarks") || url.includes("BookmarkTimeline"))
		);
	};

	const emit = (payload) => {
		window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
	};

	const originalFetch = window.fetch;
	window.fetch = async (...args) => {
		const response = await originalFetch.apply(window, args);

		try {
			const request = args[0];
			const requestUrl =
				request instanceof Request ? request.url : String(request);

			if (isTwitterBookmarksRequest(requestUrl)) {
				const cloned = response.clone();
				cloned
					.json()
					.then((data) => {
						emit({
							source: "fetch",
							url: requestUrl,
							data,
						});
					})
					.catch(() => {});
			}
		} catch (_) {}

		return response;
	};
})();
