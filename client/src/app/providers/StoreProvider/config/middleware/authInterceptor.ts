// export const authInterceptor: Middleware = ({ dispatch }) => next => action => {

// if (isRejectedWithValue(action)) {
//     console.log("action: ", action);

//     // $apiPrivate.interceptors.response.use(
//     //     config => config,
//     //     async (error: AxiosError) => {
//     //         const originalRequest = error.config as AxiosRequestConfig & { _isRetry?: boolean };
//     //         if (error.response?.status === 401 && !originalRequest._isRetry) {
//     //             originalRequest._isRetry = true;
//     //             try {
//     //                 const response = await $apiPrivate.get<User>(`/auth/refresh`);
//     //                 console.log("response: ", response);
//     //                 dispatch(userActions.setAuthData(response.data));
//     //                 return $apiPrivate.request(originalRequest);
//     //             } catch (refreshError) {
//     //                 serviceToken.unset()
//     //                 console.log('НЕ АВТОРИЗОВАН');
//     //                 // userActions.logout()
//     //             }
//     //         }

//     //         throw error
//     //     }
//     // );
// }

//     return next(action);
// }
