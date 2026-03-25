import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'


import GridWorksApiInterceptor from './_util/GridWorksApiInterceptor.ts';

import App from './App.tsx';
import AuthedSidebarOutletLayout from './_layout/AuthedSidebarOutletLayout.tsx';

import LoginPage from './LoginPage.tsx';
import InstallationsPage from './InstallationsPage.tsx';
import RealTimeStatusPage from './real-time/RealTimeStatusPage.tsx';
import VisualizerPage from './visualizer/VisualizerPage.tsx';
import DataExportPage from './DataExportPage.tsx';
import MorningReportPage from './MorningReportPage.tsx';
import ParametersPage from './ParametersPage.tsx';



createRoot(document.getElementById('root')!).render(
	// <StrictMode>
		<BrowserRouter>
			<GridWorksApiInterceptor />
			<App>
				<Routes>
					<Route path="/login/" element={<LoginPage />} />

					<Route element={<AuthedSidebarOutletLayout />}>
						<Route path="/installations/:homeId?/" element={<InstallationsPage />} />
						<Route path="/real-time/:homeId?/" element={<RealTimeStatusPage />} />
						<Route path="/visualizer/:homeId?/" element={<VisualizerPage />} />
						<Route path="/data-export/:homeId?/" element={<DataExportPage />} />
						<Route path="/morning-report/:homeId?/" element={<MorningReportPage />} />
						<Route path="/parameters/:homeId?/" element={<ParametersPage />} />
					</Route>
				</Routes>
			</App>
		</BrowserRouter>
	// </StrictMode>,
)
