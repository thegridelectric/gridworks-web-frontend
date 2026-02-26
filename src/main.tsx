import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'

import GridWorksApiInterceptor from './GridWorksApiInterceptor.ts';

import Login from './Login.tsx';
import Dashboard from './Dashboard.tsx';
import Home from './Home.tsx';


createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<GridWorksApiInterceptor />
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/login" element={<Login />} />
					<Route path="/dashboard/:homeId" element={<Dashboard />} />
				</Routes>
		</BrowserRouter>
	</StrictMode>,
)
