import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css'
import './_shared/toolCard.css'


import GridWorksApiInterceptor from './_util/GridWorksApiInterceptor.ts';

import App from './App.tsx';

import LoginPage from './auth/LoginPage.tsx';
import InstallationsPage from './installations/InstallationsPage.tsx';
import RealTimeStatusPage from './real-time/RealTimeStatusPage.tsx';
import VisualizerPage from './visualizer/VisualizerPage.tsx';
import ChannelDataExportPage from './data-export/ChannelDataExportPage.tsx';
import HourlyDataExportPage from './data-export/HourlyDataExportPage.tsx';
import InformationPage from './information/InformationPage.tsx';
import MorningReportPage from './morning-report/MorningReportPage.tsx';
import AlertsPage from './alerts/AlertsPage.tsx';
import ParametersPage from './parameters/ParametersPage.tsx';
import { StrictMode } from 'react';
import SidebarNavLayoutWithHouseSelection from './_layout/SidebarNavLayoutWithHouseSelection.tsx';



createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter basename="/gridworks-web-frontend">
			<GridWorksApiInterceptor />
			<App>
				<Routes>
					<Route path="/login/" element={<LoginPage />} />

					<Route element={<SidebarNavLayoutWithHouseSelection />}>
						<Route path="/installations/:gNode?/" element={<InstallationsPage />} />
						<Route path="/real-time/:gNode?/" element={<RealTimeStatusPage />} />
						<Route path="/visualizer/:gNode?/" element={<VisualizerPage />} />
						<Route path="/information/:gNode?/" element={<InformationPage />} />
						<Route path="/data-export-channel/:gNode?/" element={<ChannelDataExportPage />} />
						<Route path="/data-export-hourly/:gNode?/" element={<HourlyDataExportPage />} />
						<Route path="/morning-report/:gNode?/" element={<MorningReportPage />} />
						<Route path="/alerts/" element={<AlertsPage />} />
						<Route path="/parameters/:gNode?/" element={<ParametersPage />} />
					</Route>
				</Routes>
			</App>
		</BrowserRouter>
	</StrictMode>,
)
