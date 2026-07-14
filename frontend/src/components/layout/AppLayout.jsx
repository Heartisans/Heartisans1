import { Outlet, useNavigation, useLocation } from "react-router-dom"
import { useEffect } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BotpressChatbot } from "../elements/BotpressChatbot";
import BackToTop from "../elements/BackToTop";
import VAPIAssistant from "../voice/VAPIAssistant";

export const AppLayout = () => {
	const navigation = useNavigation();
	const { pathname } = useLocation();

	useEffect(() => {
		// Small timeout to ensure DOM is ready and to bypass Lenis scroll jank
		setTimeout(() => {
			window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
		}, 0);
	}, [pathname]);
	
	return (
		<div className="flex flex-col min-h-screen font-mhlk">
			<Navbar />
			<main className="flex-grow">
				<Outlet />
			</main>
			<BackToTop />
			<BotpressChatbot />
			<VAPIAssistant />
			<Footer />
		</div>
	);
};