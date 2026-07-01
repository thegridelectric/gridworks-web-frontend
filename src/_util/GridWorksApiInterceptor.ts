// AxiosInterceptor.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import GridWorksApi from './GridWorksApi.ts';
import { clearAuth } from '../auth/auth';
import type { AxiosError, AxiosResponse } from 'axios';
import { getRequiredAuthToken } from '../auth/auth.ts';

export default function GridWorksApiInterceptor({ children }: React.PropsWithChildren): React.ReactNode {

    function getFilenameFromHeader(header) {
        if (!header) return null;

        // Try to match the UTF-8 version (filename*) first
        const utf8Match = header.match(/filename\*=utf-8''([^;]+)/i);
        if (utf8Match) {
            return decodeURIComponent(utf8Match[1]);
        }

        // Fallback to standard filename=
        const standardMatch = header.match(/filename="?([^";]+)"?/i);
        if (standardMatch) {
            return standardMatch[1];
        }

        return null;
    }


    const navigate = useNavigate();

    useEffect(() => {

        const requestInterceptor = GridWorksApi.interceptors.request.use(
            (request) => {
                if (request.url?.toLowerCase() === '/api/v2/sessions' && request.method?.toLowerCase() === 'post') {
                    return request;
                }

                const token = getRequiredAuthToken();
                if (token) {
                    request.headers['Authorization'] = `Bearer ${token}`;
                }
                return request;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        const responseInterceptor = GridWorksApi.interceptors.response.use(
            (response: AxiosResponse) => {

                const contentDisposition = response.headers['content-disposition'];
                if (contentDisposition) {
                    const filename = getFilenameFromHeader(contentDisposition);
                    if (filename) {
                        const blob = new Blob([response.data]);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);

                        return null;
                    }
                }

                return response;
            },
            async (error: AxiosError) => {
                // Handle errors, specifically 401 Unauthorized
                if (error.response && error.response.status === 401) {
                    clearAuth();
                    navigate('/login/');
                    return new Promise(() => {});
                }
                if (error.response && error.response.data instanceof Blob) {
                    try {
                        const textError = await error.response.data.text()
                        const jsonError = JSON.parse(textError);
                        if (jsonError && jsonError.detail && jsonError.detail[0] && jsonError.detail[0].msg) {
                            return Promise.reject(new Error(jsonError.detail[0].msg));
                        }
                    }
                    catch (ex) {
                        console.log(ex);
                    }
                }
                // Reject the promise so the error propagates to the component's catch block
                return Promise.reject(error);
            }
        );

        // Eject the interceptor when the component unmounts
        return () => {
            GridWorksApi.interceptors.request.eject(requestInterceptor);
            GridWorksApi.interceptors.response.eject(responseInterceptor);
        };
    }, [navigate]);

    return children;
};
