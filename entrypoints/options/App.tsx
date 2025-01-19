import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { apiKeyItem, hostItem } from "~/storage/settings";

export default function App() {
	const [host, setHost] = useState("https://recally.io");
	const [apiKey, setApiKey] = useState("");
	const { toast } = useToast();

	useEffect(() => {
		// Load saved settings
		Promise.all([hostItem.getValue(), apiKeyItem.getValue()]).then(
			([savedHost, savedApiKey]) => {
				setHost(savedHost || "");
				setApiKey(savedApiKey || "");
			},
		);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await Promise.all([hostItem.setValue(host), apiKeyItem.setValue(apiKey)]);

			toast({
				title: "Settings saved",
				description: "Your settings have been saved successfully.",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to save settings.",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="container mx-auto py-10">
			<Card className="max-w-md mx-auto">
				<CardHeader>
					<CardTitle>Settings</CardTitle>
					<CardDescription>
						Configure your Recally Clipper extension settings.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="host">Host URL</Label>
							<Input
								id="host"
								placeholder="https://recally.io"
								value={host}
								onChange={(e) => setHost(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="apiKey">API Key</Label>
							<Input
								id="apiKey"
								type="password"
								placeholder="Enter your API key"
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								required
							/>
						</div>
						<Button type="submit" className="w-full">
							Save Settings
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
