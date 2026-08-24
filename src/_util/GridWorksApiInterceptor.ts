// AxiosInterceptor.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import GridWorksApi from './GridWorksApi.ts';
import { clearAuth } from '../auth/auth';
import type { AxiosError, AxiosResponse } from 'axios';

export default function GridWorksApiInterceptor({ children }: React.PropsWithChildren): React.ReactNode {

    const navigate = useNavigate();

    useEffect(() => {
        const responseInterceptor = GridWorksApi.interceptors.response.use(
            (response: AxiosResponse) => {
                // If the response is good, just return it
                return response;
            },
            (error: AxiosError) => {
                // Handle errors, specifically 401 Unauthorized
                if (error.response && error.response.status === 401) {
                    clearAuth();
                    navigate('/login/');
                    return new Promise(() => {});
                }
                // Reject the promise so the error propagates to the component's catch block
                return Promise.reject(error);
            }
        );

        // Eject the interceptor when the component unmounts
        return () => {
            GridWorksApi.interceptors.response.eject(responseInterceptor);
        };
    }, [navigate]);

    return children;
};
