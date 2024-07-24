import axios from "axios";

import { refreshTokenService } from "~/services/authService";
import { SERVER_BASE_URL } from "~/utils/constants";

const axiosInstance = axios.create({
  baseURL: SERVER_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Với trường hợp server dùng localStorage
        // const refreshToken = localStorage.getItem("refreshToken");
        // const response = await axios.post("https://your.auth.server/refresh", {
        //   refreshToken,
        // });

        // const { accessToken, refreshToken: newRefreshToken } = response.data;
        // localStorage.setItem("accessToken", accessToken);
        // localStorage.setItem("refreshToken", newRefreshToken);

        const response = await refreshTokenService();

        const { accessToken } = response.data;

        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${accessToken}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    } else if (error.response.status === 403) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;