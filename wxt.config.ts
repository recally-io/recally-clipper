import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	extensionApi: "chrome",
	modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
	manifest: {
		name: "Recally Clipper",
		description: "Clip web content to Recally",
		// default_locale: "en",
		permissions: ["storage", "activeTab", "tabs", "scripting"],
		host_permissions: ["https://*/*", "http://*/*"],
		browser_action: {
      default_popup: 'popup.html'
    }
	},
});
