import { AlertCircle, CheckCircle, Loader2, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export default function App() {
	const [isLoading, setIsLoading] = useState(false);
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState("");
	const [currentUrl, setCurrentUrl] = useState("");
	const [title, setTitle] = useState("");
	const [author, setAuthor] = useState("");
	const [published, setPublished] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [newTag, setNewTag] = useState("");
	const [content, setContent] = useState("");

	useEffect(() => {
		initializePopup();
	}, []);

	// Update dark mode detection to handle changes
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
			document.documentElement.classList.toggle("dark", e.matches);
		};

		handleChange(mediaQuery); // Set initial value
		mediaQuery.addEventListener("change", handleChange);

		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	const initializePopup = async () => {
		setIsLoading(true);
		setStatus("idle");

		try {
			// Get current tab info
			const [tab] = await browser.tabs.query({
				active: true,
				currentWindow: true,
			});

			if (!tab?.id || !tab.url) {
				throw new Error("No active tab found");
			}

			// Set initial URL and title
			setCurrentUrl(tab.url);
			setTitle(tab.title || "");

			// Process page content
			const response = await browser.tabs.sendMessage(tab.id, {
				type: "process-content",
			});

			if (!response.success) {
				throw new Error(response.error);
			}

			setContent(response.markdown);
			setTitle(response.article.title);
			setDescription(response.article.excerpt);
			setAuthor(response.article.byline);
			if (response.article.publishedTime) {
				const date: Date = new Date(response.article.publishedTime);
				setPublished(date.toISOString().split("T")[0]);
			}
		} catch (error) {
			setStatus("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to process content",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async () => {
		if (!content) {
			setStatus("error");
			setErrorMessage("No content to save");
			return;
		}

		setIsLoading(true);
		setStatus("idle");

		try {
			const response = await fetch("https://recally.io/api/v1/bookmarks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title,
					url: currentUrl,
					author,
					published_date: published,
					description,
					tags,
					content,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save to Recally");
			}

			setStatus("success");
		} catch (error) {
			setStatus("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to save content",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="w-[400px] min-h-[500px] relative dark:bg-gray-900">
			{isLoading && (
				<div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="flex flex-col items-center gap-2">
						<Loader2 className="h-6 w-6 animate-spin text-gray-800 dark:text-gray-200" />
						<p className="text-xs font-medium text-gray-800 dark:text-gray-200">
							Processing...
						</p>
					</div>
				</div>
			)}
			<div className="container mx-auto rounded-lg shadow-lg pb-12">
				<header className="p-2 flex justify-between items-center border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
					<div className="flex items-center gap-1">
						<img src="icon/16.png" alt="Recally Logo" className="h-5 w-5" />
						<h1 className="ml-1 text-xl font-bold dark:text-white">Recally</h1>
					</div>
					<button
						type="button"
						onClick={() => browser.runtime.openOptionsPage()}
						className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
					>
						<Settings className="h-4 w-4" />
					</button>
				</header>
				{(status === "success" || status === "error") && (
					<div
						className={`mx-2 mt-2 p-2 rounded text-xs flex items-center justify-between ${
							status === "success"
								? "bg-green-100 dark:bg-green-900/30"
								: "bg-red-100 dark:bg-red-900/30"
						}`}
					>
						<div className="flex items-center gap-1">
							{status === "success" ? (
								<CheckCircle className="h-4 w-4 text-green-600" />
							) : (
								<AlertCircle className="h-4 w-4 text-red-600" />
							)}
							<span
								className={
									status === "success"
										? "text-green-700 dark:text-green-200"
										: "text-red-700 dark:text-red-200"
								}
							>
								{status === "success"
									? "Successfully clipped to your library!"
									: errorMessage}
							</span>
						</div>
						<button
							type="button"
							onClick={() => setStatus("idle")}
							className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
						>
							×
						</button>
					</div>
				)}
				<div className="p-2 space-y-3">
					{/* Article Details */}
					<div className="bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-700 space-y-2">
						<h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
							Article Details
						</h2>
						<div className="grid grid-cols-2 gap-2">
							<div className="col-span-2">
								<Label htmlFor="title" className="text-xs">
									Title
								</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="mt-0.5 h-7 text-sm dark:bg-gray-800 dark:text-gray-200"
								/>
							</div>
							<div className="col-span-2">
								<Label htmlFor="source" className="text-xs">
									Source
								</Label>
								<Input
									id="source"
									value={currentUrl}
									readOnly
									className="mt-0.5 h-7 text-sm bg-gray-50 dark:bg-gray-700"
								/>
							</div>
							<div>
								<Label htmlFor="author" className="text-xs">
									Author
								</Label>
								<Input
									id="author"
									value={author}
									onChange={(e) => setAuthor(e.target.value)}
									className="mt-0.5 h-7 text-sm dark:bg-gray-800 dark:text-gray-200"
								/>
							</div>
							<div>
								<Label htmlFor="published" className="text-xs">
									Published
								</Label>
								<Input
									id="published"
									type="date"
									value={published}
									onChange={(e) => setPublished(e.target.value)}
									className="mt-0.5 h-7 text-sm dark:bg-gray-800 dark:text-gray-200"
								/>
							</div>
						</div>
					</div>

					{/* Content Section */}
					<div className="bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-700 space-y-2">
						<h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
							Content
						</h2>
						<div className="space-y-2">
							<div>
								<Label htmlFor="description" className="text-xs">
									Description
								</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="mt-0.5 text-sm min-h-[60px] dark:bg-gray-800 dark:text-gray-200"
									rows={2}
								/>
							</div>
							<div>
								<Label className="text-xs">Content Preview</Label>
								<Textarea
									id="content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									rows={6}
									className="mt-0.5 text-sm dark:bg-gray-800 dark:text-gray-200"
								/>
							</div>
						</div>
					</div>

					{/* Tags Section */}
					<div className="bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-700 space-y-2">
						<div className="flex justify-between items-center">
							<h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
								Tags
							</h2>
							<span className="text-xs text-gray-500 dark:text-gray-400">
								{tags.length} selected
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Input
								value={newTag}
								onChange={(e) => setNewTag(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && newTag.trim()) {
										setTags((prev) => [...new Set([...prev, newTag.trim()])]);
										setNewTag("");
									}
								}}
								placeholder="Add a tag..."
								className="h-7 text-sm dark:bg-gray-800 dark:text-gray-200"
							/>
						</div>
						<div className="flex flex-wrap gap-1">
							{tags.map((tag) => (
								<div
									key={tag}
									className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded flex items-center gap-1"
								>
									<span className="text-xs text-gray-700 dark:text-gray-200">
										{tag}
									</span>
									<Button
										onClick={() =>
											setTags((prev) => prev.filter((t) => t !== tag))
										}
										className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 w-3 h-3 inline-flex items-center justify-center"
									>
										<X className="h-2 w-2" />
									</Button>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Fixed Save Button */}
			<div className="fixed bottom-0 left-0 right-0 p-2 bg-white dark:bg-gray-900 border-t dark:border-gray-700 shadow-lg">
				<Button
					className="w-full h-8 text-sm font-medium"
					onClick={handleSave}
					disabled={isLoading}
				>
					{isLoading ? (
						<>
							<Loader2 className="mr-1 h-4 w-4 animate-spin" />
							Saving Content...
						</>
					) : (
						"Save to Recally"
					)}
				</Button>
			</div>
		</div>
	);
}
