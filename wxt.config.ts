import { defineConfig } from "wxt";

export default defineConfig({
	extensionApi: "chrome",
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Recally Clipper",
		description: "Clip web content to Recally",
		version: "0.0.0",
		permissions: ["activeTab", "scripting"],
		action: {
			default_popup: "popup/index.html",
		},
	},
});
