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

export default function App() {
	const { settings, loading, saveSettings } = useSettings();
	const { toast } = useToast();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		try {
			await saveSettings({
				host: formData.get("host") as string,
				apiKey: formData.get("apiKey") as string,
			});
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

	if (loading || !settings) {
		return (
			<div className="container mx-auto py-10">
				<Card className="max-w-md mx-auto">
					<CardContent className="py-10">
						<div className="flex justify-center">Loading settings...</div>
					</CardContent>
				</Card>
			</div>
		);
	}

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
								name="host"
								placeholder="https://recally.io"
								defaultValue={settings.host}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="apiKey">API Key</Label>
							<Input
								id="apiKey"
								name="apiKey"
								type="password"
								placeholder="Enter your API key"
								defaultValue={settings.apiKey}
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
