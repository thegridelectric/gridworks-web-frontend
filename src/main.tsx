import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'
import './_shared/toolCard.css'


import GridWorksApiInterceptor from './_util/GridWorksApiInterceptor.ts';

import App from './App.tsx';
import AuthedSidebarOutletLayout from './_layout/AuthedSidebarOutletLayout.tsx';

import LoginPage from './auth/LoginPage.tsx';
import InstallationsPage from './installations/InstallationsPage.tsx';
import RealTimeStatusPage from './real-time/RealTimeStatusPage.tsx';
import VisualizerPage from './visualizer/VisualizerPage.tsx';
import DataExportPage from './data-export/DataExportPage.tsx';
import ChannelDataExportPage from './data-export/ChannelDataExportPage.tsx';
import HourlyDataExportPage from './data-export/HourlyDataExportPage.tsx';
import InformationPage from './information/InformationPage.tsx';
import MorningReportPage from './morning-report/MorningReportPage.tsx';
import ParametersPage from './parameters/ParametersPage.tsx';



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
						<Route path="/information/:homeId?/" element={<InformationPage />} />
						<Route path="/data-export/:homeId?/" element={<DataExportPage />} />
						<Route path="/data-export-channel/:homeId?/" element={<ChannelDataExportPage />} />
						<Route path="/data-export-hourly/:homeId?/" element={<HourlyDataExportPage />} />
						<Route path="/morning-report/:homeId?/" element={<MorningReportPage />} />
						<Route path="/parameters/:homeId?/" element={<ParametersPage />} />
					</Route>
				</Routes>
			</App>
		</BrowserRouter>
	// </StrictMode>,
)
