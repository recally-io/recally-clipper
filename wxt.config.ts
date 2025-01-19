import { defineConfig } from "wxt";

export default defineConfig({
	extensionApi: "chrome",
	modules: [
		"@wxt-dev/module-react",
		"@wxt-dev/auto-icons",
		"@wxt-dev/i18n/module",
	],
	manifest: {
		name: "Recally Clipper",
		description: "Clip web content to Recally",
		default_locale: "en",
		version: "0.0.0",
		permissions: ["activeTab", "scripting"],
		action: {
			default_popup: "popup/index.html",
		},
	},
});
